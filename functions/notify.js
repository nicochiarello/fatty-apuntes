const logger = require("firebase-functions/logger");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

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
 * Sends one notification to every registered device, optionally skipping one person's.
 *
 * Data-only on purpose: with a `notification` block the browser renders the message itself
 * and the service worker's push handler may never run, which would lose the click-through
 * link.
 *
 * @param {{ title: string, body: string, link: string, exceptUid?: string }} message
 */
async function notifyEveryone({ title, body, link, exceptUid }) {
  const db = getFirestore();
  const tokensSnap = await db.collection("fcmTokens").get();
  const targets = exceptUid
    ? tokensSnap.docs.filter((doc) => doc.get("uid") !== exceptUid)
    : tokensSnap.docs;

  if (targets.length === 0) {
    logger.info("Nada que notificar: no hay tokens registrados");
    return { sent: 0, removed: 0 };
  }

  let sent = 0;
  let removed = 0;

  for (let start = 0; start < targets.length; start += BATCH) {
    const batch = targets.slice(start, start + BATCH);

    const response = await getMessaging().sendEachForMulticast({
      tokens: batch.map((doc) => doc.id),
      data: { title, body, link },
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

  return { sent, removed };
}

module.exports = { notifyEveryone, SITE };
