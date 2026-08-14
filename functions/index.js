const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

// Collocated with the Firestore database (southamerica-west1): a 2nd-gen Firestore
// trigger fires through Eventarc in the database's region, so a function elsewhere
// pays a cross-region hop on every note.
setGlobalOptions({ region: "southamerica-west1", maxInstances: 5 });

const { notifyEveryone, SITE } = require("./notify");

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

  const link = `${SITE}/note/?year=${after.yearId}&subject=${after.subjectId}&id=${event.params.noteId}`;
  const author = after.authorName || "Alguien";

  const { sent, removed } = await notifyEveryone({
    title: "Nuevo apunte",
    body: `${author} subió el apunte "${after.title}"`,
    link,
    // The person who just uploaded it does not need telling.
    exceptUid: after.authorId,
  });

  logger.info(`Apunte anunciado: ${sent} enviadas, ${removed} tokens muertos eliminados`);
});

// Recordatorios del calendario: la cola y el trigger que arranca las cadenas.
const reminders = require("./reminders");
exports.sendEventReminder = reminders.sendEventReminder;
exports.scheduleEventReminders = reminders.scheduleEventReminders;
