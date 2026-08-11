// Keyboard cursor — move a pointer with the arrow keys, click with Enter.
// Independent of dark mode: its own shortcut, its own state.
const STEP = 28;   // px per arrow press — knob, raise it if this feels slow
const FAST = 8;    // Shift multiplier for crossing the page
const KEYS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
const CURSOR_ID = 'dark-any-cursor';

// Pure: given a position and a key, where does the cursor land and how far must
// the page scroll to keep it on screen. Kept separate so test.html can assert it.
function nextPos(pos, key, fast, vw, vh) {
  const [dx, dy] = KEYS[key];
  const d = STEP * (fast ? FAST : 1);
  let x = pos.x + dx * d, y = pos.y + dy * d;
  const scroll = { dx: 0, dy: 0 };
  if (x < 0) { scroll.dx = x; x = 0; }
  if (y < 0) { scroll.dy = y; y = 0; }
  if (x > vw - 1) { scroll.dx = x - (vw - 1); x = vw - 1; }
  if (y > vh - 1) { scroll.dy = y - (vh - 1); y = vh - 1; }
  return { x, y, scroll };
}

let pos = null, dot = null, hovered = null;

const isTyping = () => {
  const a = document.activeElement;
  return !!a && (a.isContentEditable || /^(input|textarea|select)$/i.test(a.tagName));
};

// Positioned in page coords, not fixed: dark mode's filter on <html> makes
// position:fixed scroll with the page, so absolute + scroll offset is the honest fix.
const draw = () => { dot.style.transform = `translate(${pos.x + scrollX}px, ${pos.y + scrollY}px)`; };

// Menus and tooltips open on hover, so a cursor that only clicks is half a cursor.
function sendHover() {
  const t = document.elementFromPoint(pos.x, pos.y);
  if (!t) return;
  const o = { bubbles: true, view: window, clientX: pos.x, clientY: pos.y };
  if (t !== hovered) {
    if (hovered) hovered.dispatchEvent(new MouseEvent('mouseout', o));
    t.dispatchEvent(new MouseEvent('mouseover', o));
    hovered = t;
  }
  t.dispatchEvent(new MouseEvent('mousemove', o));
}

function activate() {
  const t = document.elementFromPoint(pos.x, pos.y);
  if (!t) return;
  t.focus?.();
  if (!isTyping()) t.click(); // a focused text field wants the caret, not a click
}

function onKey(e) {
  if (e.key === 'Escape') return cursorOff();
  if (isTyping() && e.key !== 'Escape') return; // never steal arrows from a text field
  if (KEYS[e.key]) {
    const next = nextPos(pos, e.key, e.shiftKey, innerWidth, innerHeight);
    pos = { x: next.x, y: next.y };
    if (next.scroll.dx || next.scroll.dy) scrollBy(next.scroll.dx, next.scroll.dy);
    draw();
    sendHover();
  } else if (e.key === 'Enter' || e.key === ' ') {
    activate();
  } else {
    return;
  }
  e.preventDefault();
  e.stopPropagation();
}

function cursorOn() {
  if (dot) return;
  dot = document.createElement('div');
  dot.id = CURSOR_ID;
  dot.style.cssText = `position:absolute;left:0;top:0;width:18px;height:18px;margin:-9px 0 0 -9px;
    border:2px solid #fff;border-radius:50%;pointer-events:none;z-index:2147483647;
    box-shadow:0 0 0 2px #000, inset 0 0 0 2px #000;`;
  document.body.append(dot);
  pos = { x: Math.round(innerWidth / 2), y: Math.round(innerHeight / 2) };
  draw();
  addEventListener('keydown', onKey, true);
  addEventListener('scroll', draw, true);
}

function cursorOff() {
  if (!dot) return;
  removeEventListener('keydown', onKey, true);
  removeEventListener('scroll', draw, true);
  dot.remove();
  dot = null;
  hovered = null;
}

if (globalThis.chrome?.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
    // Session-only on purpose: a mouse-replacement mode you forgot was on is worse
    // than one you re-arm, so it never persists across page loads.
    if (msg === 'cursor-state') return void respond(!!dot);
    if (msg !== 'toggle-cursor') return;
    (dot ? cursorOff : cursorOn)();
    respond(!!dot);
  });
}

globalThis.darkAnyCursor = { nextPos, cursorOn, cursorOff, STEP, FAST, CURSOR_ID };
