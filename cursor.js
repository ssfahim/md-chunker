// Keyboard cursor — hold an arrow and the pointer glides, it does not hop.
// Independent of dark mode: its own shortcut, its own state.
//
// Wrapped in a function so running this file twice in one page is harmless. It happens:
// the worker injects into tabs that predate the extension, and reloading an unpacked
// extension leaves an orphaned copy behind in every open tab. At top level those two
// copies fought and each drew its own cursor — hence two rings on screen.
(() => {
// Hand over from an earlier copy instead of running alongside it.
globalThis.darkAnyCursor?.cursorOff?.();
// counts completed executions, so a test can prove a second one ran instead of dying
globalThis.__darkAnyCursorLoads = (globalThis.__darkAnyCursorLoads || 0) + 1;

// Knobs are physical: these are pixels per second on a real screen. Tune to taste.
const V0 = 320;      // speed the instant a key goes down, px/s
const VMAX = 2400;   // ceiling, px/s
const ACCEL = 2800;  // ramp while the key stays down, px/s²
const FAST = 2.2;    // Shift multiplier
const KEYS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
const CURSOR_ID = 'dark-any-cursor';

// Pure: speed after holding a key for heldMs. Starts brisk so a tap still nudges,
// then accelerates, so the same key serves both "next word" and "other side of screen".
const speedAt = (heldMs, fast) =>
  Math.min(VMAX, V0 + ACCEL * (Math.max(0, heldMs) / 1000)) * (fast ? FAST : 1);

// Pure: move dist px along dir, clamp into the viewport, hand the overflow to scroll.
// dir is normalised so diagonals are not faster than straight lines.
function advance(pos, dir, dist, vw, vh) {
  const len = Math.hypot(dir.x, dir.y) || 1;
  let x = pos.x + (dir.x / len) * dist;
  let y = pos.y + (dir.y / len) * dist;
  const scroll = { dx: 0, dy: 0 };
  if (x < 0) { scroll.dx = x; x = 0; }
  if (y < 0) { scroll.dy = y; y = 0; }
  if (x > vw - 1) { scroll.dx = x - (vw - 1); x = vw - 1; }
  if (y > vh - 1) { scroll.dy = y - (vh - 1); y = vh - 1; }
  return { x, y, scroll };
}

const dirOf = keys => {
  let x = 0, y = 0;
  for (const k of keys) { x += KEYS[k][0]; y += KEYS[k][1]; }
  return { x, y };
};

let pos = null, dot = null, hovered = null;
let held = new Set(), raf = 0, lastT = 0, downT = 0, fast = false;

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

// One frame of motion at timestamp t. Separate from the scheduling below so it can be
// driven with known timestamps instead of at the mercy of the display.
function step(t) {
  const dt = Math.min(50, t - lastT) / 1000; // cap dt so a stalled tab cannot teleport it
  lastT = t;
  const next = advance(pos, dirOf(held), speedAt(t - downT, fast) * dt, innerWidth, innerHeight);
  pos = { x: next.x, y: next.y };
  if (next.scroll.dx || next.scroll.dy) scrollBy(next.scroll.dx, next.scroll.dy);
  draw();
  sendHover();
}

function frame(t) {
  if (!dot || !held.size) { raf = 0; return; }
  step(t);
  raf = requestAnimationFrame(frame);
}

const resetRun = t => { downT = t; lastT = t; }; // start of a fresh accelerating run

function activate() {
  const t = document.elementFromPoint(pos.x, pos.y);
  if (!t) return;
  t.focus?.();
  if (!isTyping()) t.click(); // a focused text field wants the caret, not a click
}

const stopMoving = () => {
  held.clear();
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
};

function onKey(e) {
  if (e.key === 'Escape') return cursorOff();
  if (isTyping()) return; // never steal arrows from a text field
  if (KEYS[e.key]) {
    fast = e.shiftKey;
    if (!held.has(e.key)) {
      held.add(e.key);
      if (!raf) { // first key of a run: reset the ramp and start the loop
        resetRun(performance.now());
        raf = requestAnimationFrame(frame);
      }
    }
  } else if (e.key === 'Enter' || e.key === ' ') {
    activate();
  } else {
    return;
  }
  e.preventDefault();
  e.stopPropagation();
}

function onKeyUp(e) {
  if (!KEYS[e.key]) return;
  held.delete(e.key);
  if (!held.size && raf) { cancelAnimationFrame(raf); raf = 0; }
}

function cursorOn() {
  if (dot) return;
  // sweep any ring left behind by an orphaned copy before drawing ours
  document.querySelectorAll('#' + CURSOR_ID).forEach(el => el.remove());
  dot = document.createElement('div');
  dot.id = CURSOR_ID;
  dot.style.cssText = `position:absolute;left:0;top:0;width:18px;height:18px;margin:-9px 0 0 -9px;
    border:2px solid #fff;border-radius:50%;pointer-events:none;z-index:2147483647;
    box-shadow:0 0 0 2px #000, inset 0 0 0 2px #000;`;
  document.body.append(dot);
  pos = { x: Math.round(innerWidth / 2), y: Math.round(innerHeight / 2) };
  draw();
  addEventListener('keydown', onKey, true);
  addEventListener('keyup', onKeyUp, true);
  addEventListener('scroll', draw, true);
  addEventListener('blur', stopMoving); // a missed keyup would otherwise glide forever
}

function cursorOff() {
  if (!dot) return;
  stopMoving();
  removeEventListener('keydown', onKey, true);
  removeEventListener('keyup', onKeyUp, true);
  removeEventListener('scroll', draw, true);
  removeEventListener('blur', stopMoving);
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

const place = (x, y) => { pos = { x, y }; draw(); }; // viewport coords

globalThis.darkAnyCursor = {
  advance, speedAt, dirOf, cursorOn, cursorOff, place,
  step, resetRun, held, isMoving: () => !!raf,
  V0, VMAX, ACCEL, FAST, CURSOR_ID,
};
})();
