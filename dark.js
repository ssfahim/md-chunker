// Dark Any Page — invert the page, un-invert the media, calm the text.
// Wrapped like cursor.js so a second injection into the same page is harmless
// rather than a redeclaration that kills the whole script.
(() => {
globalThis.__darkAnyLoads = (globalThis.__darkAnyLoads || 0) + 1; // see cursor.js
// Perceptual knobs. Screens and eyes differ; tune these, not the logic.
const CONTRAST = 0.92;   // pure invert looks harsh; back it off slightly
const BRIGHTNESS = 1.06; // ...then lift it back so body text isn't muddy
const DARK_BELOW = 0.35; // relative luminance under this = page is already dark

const FLIP = 'invert(1) hue-rotate(180deg)';
const STYLE_ID = 'dark-any';
const CSS = `
html {
  filter: ${FLIP} contrast(${CONTRAST}) brightness(${BRIGHTNESS}) !important;
  background: #fff !important;
  color-scheme: light !important;  /* so native controls invert INTO dark */
}
/* cancel the flip for anything that carries its own colours */
img, video, canvas, svg, picture, embed, object,
[style*="background-image"] { filter: ${FLIP} !important; }
/* A PDF is a white page, not artwork: let it flip with everything else. Without this
   the rule above catches it as an embed and hands back a blazing white sheet. */
embed[type="application/pdf"], object[type="application/pdf"] { filter: none !important; }
/* escape hatch: let this element stay flipped — for black-on-transparent logos
   and line diagrams, which vanish when their colours are preserved */
[data-dark-any-flip] { filter: none !important; }
/* our own keyboard cursor is drawn in final colours, so undo the flip for it too */
#dark-any-cursor { filter: ${FLIP} !important; }
/* text tuned for a light background gets halos once flipped */
* { text-shadow: none !important; }
`;

const on = () => {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = CSS;
  (document.head || document.documentElement).append(el);
};

const off = () => document.getElementById(STYLE_ID)?.remove();

// "rgb(r, g, b)" / "rgba(r, g, b, a)" -> relative luminance 0..1.
// Fully transparent means we are seeing the browser's white default.
function luminanceOf(color) {
  const [r, g, b, a = '1'] = (color.match(/[\d.]+/g) || ['255', '255', '255']);
  if (+a === 0) return 1;
  const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(+r) + 0.7152 * lin(+g) + 0.0722 * lin(+b);
}

function pageIsDark() {
  const el = document.body || document.documentElement;
  return luminanceOf(getComputedStyle(el).backgroundColor) < DARK_BELOW;
}

// The built-in PDF viewer is a trap for the luminance check: the page we can see is a
// bare wrapper whose body is the viewer's dark grey chrome, so it reads as "already
// dark" while the actual paper — drawn by the PDF process, not in this DOM — is white.
const isPdfViewer = () => document.contentType === 'application/pdf';

// Pure: given the stored preference and what the page looks like, on or off.
function decide(pref, pdf, dark) {
  if (pref === 'off' || pref === 'on') return pref; // the user's choice always wins
  if (pdf) return 'on';
  return dark ? 'off' : 'on';
}

const store = globalThis.chrome?.storage?.local;

if (store) {
  on(); // assume light so there is no white flash; corrected below

  // ponytail: storage read is async, so a forced-off site flashes dark for a frame.
  // Live with it, or move the site list into a document_start-injected CSS rule.
  const settle = async () => {
    const { sites = {} } = await store.get('sites');
    const pref = sites[location.hostname];
    decide(pref, isPdfViewer(), pageIsDark()) === 'on' ? on() : off();
  };
  // Not just DOMContentLoaded: when injected into an already-open tab that event
  // has long fired, and we would never correct ourselves off a dark site.
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', settle);
  else settle();

  chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
    if (msg === 'dark-state') { respond(!!document.getElementById(STYLE_ID)); return; }
    if (msg !== 'toggle') return;
    const wasOn = !!document.getElementById(STYLE_ID);
    wasOn ? off() : on();
    respond(!wasOn);
    store.get('sites').then(({ sites = {} }) => {
      sites[location.hostname] = wasOn ? 'off' : 'on';
      store.set({ sites });
    });
  });
}

globalThis.darkAny = { luminanceOf, pageIsDark, isPdfViewer, decide, on, off, CSS, DARK_BELOW };
})();
