"use client";

// Overrides applied on top of the uploaded document: some HTML exports (Notion, Word,
// custom docs with a sticky table of contents) set `overflow: hidden` / a fixed height
// on <body>, which silently swallows anchor-link scrolling inside the iframe. Appended
// last so these `!important` rules win regardless of where they land in the parsed doc.
const SCROLL_FIX_STYLES = `
<style>
  html, body {
    height: auto !important;
    min-height: 100% !important;
    overflow-y: auto !important;
  }
</style>
`;

// allow-scripts alone (no allow-same-origin) still gives the frame a real, working
// document — it just can't read this app's cookies/storage/Firebase session, since it
// stays on a unique opaque origin. That's enough isolation for notes uploaded by the
// group itself, and lets JS-driven tables of contents / accordions work correctly.
//
// In `next dev` specifically, that opaque origin also gets caught by Next's own
// dev-server protection (it blocks HMR chunk requests from origins it can't identify),
// which hangs the whole app — a dev-tooling quirk, not present in the production build.
// So dev also grants allow-same-origin, trading a bit of isolation for a working local
// testing loop; production keeps the stricter, isolated sandbox.
const SANDBOX =
  process.env.NODE_ENV === "development" ? "allow-scripts allow-same-origin" : "allow-scripts";

export function HtmlViewer({ content }: { content: string }) {
  return (
    <iframe
      srcDoc={content + SCROLL_FIX_STYLES}
      sandbox={SANDBOX}
      title="Contenido del apunte"
      className="h-full w-full bg-white"
    />
  );
}
