// Dark Any Page — invert the page, un-invert the media, calm the text.
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

const store = globalThis.chrome?.storage?.local;

if (store) {
  on(); // assume light so there is no white flash; corrected below

  // ponytail: storage read is async, so a forced-off site flashes dark for a frame.
  // Live with it, or move the site list into a document_start-injected CSS rule.
  addEventListener('DOMContentLoaded', async () => {
    const { sites = {} } = await store.get('sites');
    const pref = sites[location.hostname];
    if (pref === 'off') return off();
    if (pref === 'on') return on();
    if (pageIsDark()) off(); // site already ships a dark theme, leave it alone
  });

  chrome.runtime.onMessage.addListener(async msg => {
    if (msg !== 'toggle') return;
    const nowOn = !!document.getElementById(STYLE_ID);
    nowOn ? off() : on();
    const { sites = {} } = await store.get('sites');
    sites[location.hostname] = nowOn ? 'off' : 'on';
    await store.set({ sites });
  });
}

globalThis.darkAny = { luminanceOf, pageIsDark, on, off, CSS, DARK_BELOW };
