/**
 * Version of the deployed app, bumped by hand on every change that gets pushed.
 *
 * There is no build-time git or CI plumbing behind this on purpose — it is a single
 * constant so it stays readable in the source and predictable in the bundle. Its job is to
 * answer "which build is this person actually running?", which matters more than usual
 * here: the service worker caches aggressively, so a stale bundle looks identical to a
 * fresh one unless the screen tells you otherwise.
 *
 * Bump it in the same commit as the change it ships.
 */
export const APP_VERSION = "0.2.2";
