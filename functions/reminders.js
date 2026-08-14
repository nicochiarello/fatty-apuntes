const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onTaskDispatched } = require("firebase-functions/v2/tasks");
const logger = require("firebase-functions/logger");
const { getFirestore } = require("firebase-admin/firestore");
const { getFunctions } = require("firebase-admin/functions");

const { notifyEveryone, SITE } = require("./notify");
const { initialSteps, nextStep, occurrenceAt } = require("./shared/lib/reminders");
const { CALENDAR_TIME_ZONE } = require("./shared/lib/calendarTime");

const COLLECTION = "calendarEvents";

/**
 * The queue lives in southamerica-east1, not in southamerica-west1 with everything else:
 * Cloud Tasks does not exist in west1, and creating the queue there fails outright. East1
 * (São Paulo) is the closest region that does.
 *
 * The name is qualified with that region on purpose — given a bare name the Admin SDK
 * assumes us-central1 and would enqueue against a queue that does not exist, and only at
 * runtime.
 */
const QUEUE_REGION = "southamerica-east1";
const QUEUE = `locations/${QUEUE_REGION}/functions/sendEventReminder`;

/**
 * Cloud Tasks refuses a scheduleTime more than 30 days out. Rather than pre-computing every
 * reminder and sweeping a database for the ones that come into range, a hop further away
 * than this is replaced by a relay: a task that does nothing except schedule the same hop
 * again when it wakes up. A day of margin under the real limit absorbs clock skew.
 */
const MAX_SCHEDULE_AHEAD_MS = 29 * 24 * 60 * 60 * 1000;

const WHEN_FORMAT = new Intl.DateTimeFormat("es-AR", {
  timeZone: CALENDAR_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Enqueues one hop of a chain.
 *
 * The task id is derived from what the hop *is*, so a retry that already got as far as
 * enqueueing cannot produce a second copy — Cloud Tasks rejects a duplicate name. It
 * includes scheduleVersion, so a rescheduled event gets a fresh set of names rather than
 * colliding with the chain it replaces.
 */
async function enqueueStep(eventId, scheduleVersion, step, relayCount = 0) {
  const now = Date.now();
  const tooFar = step.fireAt - now > MAX_SCHEDULE_AHEAD_MS;
  const scheduleTime = new Date(tooFar ? now + MAX_SCHEDULE_AHEAD_MS : step.fireAt);

  const id =
    `ev${eventId}-v${scheduleVersion}-r${step.ruleIndex}-o${step.occurrenceIndex}` +
    (tooFar ? `-relay${relayCount}` : "");

  await getFunctions()
    .taskQueue(QUEUE)
    .enqueue(
      {
        eventId,
        scheduleVersion,
        ruleIndex: step.ruleIndex,
        occurrenceIndex: step.occurrenceIndex,
        relay: tooFar,
        relayCount: tooFar ? relayCount + 1 : 0,
      },
      { scheduleTime, id },
    );

  logger.info(
    `${tooFar ? "Relay" : "Aviso"} encolado ${id} para ${scheduleTime.toISOString()}`,
  );
}

/**
 * Reads the event a task refers to and decides whether that task is still meaningful.
 *
 * This single check is what retires chains: a done, deleted or rescheduled event simply
 * stops answering, and because a task that stops here never enqueues its successor, the
 * whole chain ends without anything having to find and delete queued tasks.
 */
async function loadLiveEvent(eventId, scheduleVersion) {
  const snap = await getFirestore().collection(COLLECTION).doc(eventId).get();
  if (!snap.exists) return { skip: "el evento fue eliminado" };

  const event = snap.data();
  if (event.done) return { skip: "el evento está marcado como hecho" };
  if (event.scheduleVersion !== scheduleVersion) {
    return { skip: `versión obsoleta (${scheduleVersion} ≠ ${event.scheduleVersion})` };
  }
  return { event };
}

/** Fires one reminder, then schedules the next hop of its chain. */
exports.sendEventReminder = onTaskDispatched(
  {
    region: QUEUE_REGION,
    retryConfig: { maxAttempts: 3, minBackoffSeconds: 30 },
    rateLimits: { maxConcurrentDispatches: 6 },
  },
  async (request) => {
    const { eventId, scheduleVersion, ruleIndex, occurrenceIndex, relay, relayCount } =
      request.data;

    const { event, skip } = await loadLiveEvent(eventId, scheduleVersion);
    if (skip) {
      logger.info(`Cadena detenida (${eventId}): ${skip}`);
      return;
    }

    const rule = event.reminders?.[ruleIndex];
    if (!rule) return;

    const fireAt = occurrenceAt(event, rule, occurrenceIndex);
    if (fireAt === null) return;

    // A relay only exists to get past the scheduling horizon; it re-queues the very same
    // hop and deliberately sends nothing.
    if (relay) {
      await enqueueStep(eventId, scheduleVersion, { ruleIndex, occurrenceIndex, fireAt }, relayCount);
      return;
    }

    const { sent } = await notifyEveryone({
      title: "Recordatorio",
      body: `${event.title} — ${WHEN_FORMAT.format(new Date(event.dueAt))}`,
      link: `${SITE}/dashboard/calendario/`,
    });
    logger.info(`Recordatorio de "${event.title}" enviado a ${sent} dispositivos`);

    const next = nextStep(event, ruleIndex, occurrenceIndex);
    if (next) await enqueueStep(eventId, scheduleVersion, next);
    else logger.info(`Cadena ${ruleIndex} de ${eventId} terminada`);
  },
);

/**
 * Starts a fresh chain per rule whenever an event's schedule changes.
 *
 * Keyed on scheduleVersion rather than on which fields changed: the app bumps it exactly
 * when reminders become invalid — a new date, edited rules, or un-marking done — so
 * renaming an event does not restart anything, and the chains already in flight retire
 * themselves against the same number.
 */
exports.scheduleEventReminders = onDocumentWritten(
  `${COLLECTION}/{eventId}`,
  async (event) => {
    const before = event.data?.before?.exists ? event.data.before.data() : null;
    const after = event.data?.after?.exists ? event.data.after.data() : null;

    if (!after) return; // deleted: queued tasks retire themselves
    if (after.done) return;
    if (before && before.scheduleVersion === after.scheduleVersion) return;
    if (!Array.isArray(after.reminders) || after.reminders.length === 0) return;

    // Starting from "now" is what makes an edit skip the occurrences that already went
    // past, instead of firing a burst of late reminders.
    const steps = initialSteps(after, Date.now());
    if (steps.length === 0) {
      logger.info(`Sin avisos futuros para ${event.params.eventId}`);
      return;
    }

    await Promise.all(
      steps.map((step) =>
        enqueueStep(event.params.eventId, after.scheduleVersion, step).catch((error) => {
          // One rule failing to enqueue must not take the others down with it.
          logger.error(`No se pudo encolar la regla ${step.ruleIndex}`, error);
        }),
      ),
    );
  },
);
