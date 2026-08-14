const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();

// Collocated with the Firestore database (southamerica-west1): a 2nd-gen Firestore
// trigger fires through Eventarc in the database's region, so a function elsewhere
// pays a cross-region hop on every note.
setGlobalOptions({ region: "southamerica-west1", maxInstances: 5 });

const SITE = "https://fattyapuntes.web.app";

// sendEachForMulticast caps at 500 tokens per call.
const BATCH = 500;

// Tokens FCM tells us are dead. Anything else (a transient network or quota error) is left
// alone, so a blip never silently unsubscribes somebody.
const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

/**
 * Announces a note once, to everyone except its author.
 *
 * Written on `onDocumentWritten` rather than `onDocumentCreated` because a note can become
 * announceable in two different ways: an upload arrives complete, while "Escribir apunte"
 * creates an empty draft first and only becomes real on its first save. Firing on creation
 * alone would notify everyone about a blank note titled whatever was typed in the dialog.
 */
exports.announceNote = onDocumentWritten("notes/{noteId}", async (event) => {
  const before = event.data?.before?.exists ? event.data.before.data() : null;
  const after = event.data?.after?.exists ? event.data.after.data() : null;

  if (!after) return; // deleted

  // Notes created before `draft` existed have no field at all, which reads as published —
  // so editing an old note never re-announces it.
  const isPublished = after.draft !== true;
  const wasPublished = before ? before.draft !== true : false;
  if (!isPublished || wasPublished) return;

  const tokensSnap = await db.collection("fcmTokens").get();
  const targets = tokensSnap.docs.filter((doc) => doc.get("uid") !== after.authorId);
  if (targets.length === 0) {
    logger.info("Nada que notificar: no hay tokens de otros usuarios");
    return;
  }

  const link = `${SITE}/note/?year=${after.yearId}&subject=${after.subjectId}&id=${event.params.noteId}`;
  const author = after.authorName || "Alguien";

  let sent = 0;
  let removed = 0;

  for (let start = 0; start < targets.length; start += BATCH) {
    const batch = targets.slice(start, start + BATCH);

    // Data-only on purpose: with a `notification` block the browser renders the message
    // itself and our service worker's push handler may never run, which would lose the
    // click-through link.
    const response = await getMessaging().sendEachForMulticast({
      tokens: batch.map((doc) => doc.id),
      data: {
        title: "Nuevo apunte",
        body: `${author} subió el apunte "${after.title}"`,
        link,
      },
      webpush: { headers: { Urgency: "normal", TTL: "86400" } },
    });

    sent += response.successCount;

    const dead = batch.filter((_, index) => {
      const result = response.responses[index];
      return !result.success && DEAD_TOKEN_CODES.has(result.error?.code);
    });
    await Promise.all(dead.map((doc) => doc.ref.delete().catch(() => {})));
    removed += dead.length;
  }

  logger.info(`Apunte anunciado: ${sent} enviadas, ${removed} tokens muertos eliminados`);
});
