# Dark Any Page

A browser extension with two independent features:

1. **Dark mode** — turns light pages dark, leaves images and video looking normal, and
   keeps text legible instead of washed out. On by default for light pages.
2. **Keyboard cursor** — a pointer you drive with the arrow keys, so you can click
   without touching the mouse. Off by default, armed per page.

Same extension runs on **macOS and Windows** — Chrome, Edge and Brave load identical
files on both. There is nothing OS-specific to build.

## The popup

Click the toolbar icon. Two buttons, each showing its own shortcut and outlined in green
while that feature is active:

- **Activate cursor** / Deactivate cursor
- **Activate dark theme** / Deactivate dark theme

The buttons are the reliable path — they work on tabs that were already open when the
extension loaded, which is exactly where the shortcuts used to do nothing (see below).

## Shortcuts

| Action | macOS | Windows |
|--------|-------|---------|
| Toggle the keyboard cursor | `Opt` `Shift` `C` | `Alt` `Shift` `C` |
| Toggle dark mode on this site | `Opt` `Shift` `D` (or the toolbar button) | `Alt` `Shift` `D` (or the toolbar button) |

Same shortcut turns the cursor off again. Rebind either at `chrome://extensions/shortcuts`
— and check there first if a shortcut does nothing, because Chrome silently leaves a
suggested key unassigned when something else already owns it.

**If a shortcut looks dead on a tab you already had open:** it was, and now it is fixed.
Chrome only injects content scripts into pages loaded *after* the extension, so every
tab open at "Load unpacked" time had nothing listening, and the message was dropped
silently. The worker now injects the scripts on that first failed message and retries,
so both the buttons and the shortcuts work on old tabs without a reload.

**Why not `Cmd`+`Opt`+`C`:** Chrome refuses to load an extension that asks for it.
`Ctrl+Alt+*` is banned outright (it collides with AltGr on Windows layouts) and
`Command+Alt+*` is rejected too — both verified against the browser, which fails with
`Invalid value for 'commands[…]'` rather than just ignoring the key. Of the combos that
do load, `Opt/Alt+Shift+C` is the same physical keys on both platforms and avoids
`Cmd+Shift+C`, which is already the DevTools element picker.

## How it works

The page gets `filter: invert(1) hue-rotate(180deg)`, which flips light to dark while
keeping hues where they were (blue links stay blue). Images, video, canvas and SVG are
flipped a second time so they come out unchanged. Text coherence comes from three
things: contrast relationships survive the flip untouched, `text-shadow` is dropped
(shadows meant for a light background turn into halos), and `color-scheme: light` makes
native controls render light so they invert *into* dark instead of staying pale.

Sites that already ship a dark theme are detected by background luminance and left
alone.

## Install (macOS and Windows, identical steps)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and pick this folder.

Chrome remembers it across restarts. To move it to the other machine, copy the folder
over and repeat the three steps.

## Use — dark mode

- Automatic on every light page.
- Click the toolbar button (or the shortcut above) to force the current site on or off;
  the choice is remembered per hostname.

## Use — keyboard cursor

Press the cursor shortcut. A ring appears in the middle of the page.

| Key | Does |
|-----|------|
| Arrow keys | hold to glide; it starts slow for precision and accelerates |
| Two arrows at once | diagonal, at the same speed as a straight line |
| `Shift` + arrow | 2.2× faster, for crossing the page |
| `Enter` or `Space` | click whatever is under the cursor |
| `Esc` | leave a focused text field, or put the cursor away |

`Enter` acts on whatever the cursor points at, even when a text field elsewhere has
focus — pages autofocus search boxes constantly, and that used to kill `Enter` across the
whole page. The page keeps the key only when it is genuinely the page's: the cursor is
sitting on a text field (so forms still submit), or `Space` is needed to type a space.
Arrow keys always belong to a focused text field; `Esc` steps out of it without putting
the cursor away.

Motion is a velocity ramp on an animation frame, not a fixed hop per keypress: a tap
nudges it a few pixels, a held key winds up to full speed. Measured on a 484 px viewport,
it opens at 5.8 px per frame and reaches ~26 px, crossing the whole width in about half a
second. The four knobs at the top of `cursor.js` (`V0`, `VMAX`, `ACCEL`, `FAST`) are in
real px/s — if it feels too twitchy or too sluggish on your screen, change them there.

Pushing past a viewport edge pins the cursor there and scrolls the page instead, so
nothing is out of reach. Moving also fires hover events, so dropdown menus and tooltips
open the way they do under a real mouse. Arrow keys inside a text field are left alone —
they edit text, and the cursor stays parked until you click out.

The cursor is deliberately **session-only**: it never comes back on by itself after a
reload. A mouse-replacement mode you forgot was armed is worse than one you re-arm.

## PDFs

PDFs get **dimmed, not inverted** — `PDF_MODE = 'dim'` in `dark.js`. The paper drops to a
soft grey instead of glaring white, and the viewer's toolbar, sidebar and surround stay
dark.

That is a deliberate compromise, forced by a hard limit. In the built-in viewer, the
document you can script is a bare wrapper; the paper, the chrome and the surround are all
painted by a separate browser process, so **nothing in there can be selected
individually** — a filter on `<html>` hits the lot. Invert it and yes, the paper goes
black, but the viewer's dark chrome and its large surround go bright, which is worse to
read against than the white paper was.

And no clever filter escapes it: the paper's white (255) must become dark while the
toolbar's icons (~230, nearly the same value) must stay light. No per-pixel function can
send two near-identical values in opposite directions, so **dark paper plus dark surround
is not achievable** from an extension.

If you want true white-on-black paper and can live with a bright surround, set
`PDF_MODE = 'invert'`. `PDF_DIM` (default `0.45`) sets how far the paper is dimmed.
Either way `Alt`/`Opt`+`Shift`+`D` still turns the whole thing off per site, back to the
browser's untouched view.

A PDF embedded in an ordinary page is handled separately: it inherits the page's flip,
where it would otherwise be caught by the "protect media" rule and handed back white.

## Known ceilings

- **Logos that are black on transparent** (e.g. Wikipedia's wordmark) keep their
  colours and go dim against the new dark background. Fix per-element by tagging it
  `data-dark-any-flip`, which lets it invert with the page.
- **Iframes** inherit the page flip, so embedded video players can look inverted.
  Handling frames separately means running per-frame and avoiding a double flip.
- **CSS background images** are only re-flipped when set via an inline `style`
  attribute; ones from a stylesheet get inverted. Catching those needs a
  `getComputedStyle` walk over the DOM, which costs more than it is worth here.
- A site forced **off** flashes dark for one frame, because the stored per-site list is
  read asynchronously after the stylesheet is already in.
- The cursor **cannot enter an iframe or a closed shadow root**, and neither shortcut
  fires on `chrome://` pages or the Web Store — extensions get no script there.
- **After reloading the extension**, tabs you already had open still hold an orphaned
  copy of the old scripts. The new copy takes over from it on load and sweeps any ring
  it left behind, but reloading the page is still the cleanest way to start fresh.
- The cursor **clicks, it does not drag**. Sliders, canvases and drag-and-drop still
  need the mouse; that would mean holding the button down across a move.
- Clicks are synthetic, so `event.isTrusted` is false. The rare handler that insists on
  a trusted event will ignore the cursor, and nothing short of a real mouse fixes that.
- The **keyboard cursor does not work inside the PDF viewer** — the viewer is a separate
  process, so key events and hit testing never reach the page. Only the darkening does.
- PDFs are recognised by a `.pdf` URL, plus the worker injects into such tabs on load in
  case content scripts are not run there by default. A PDF served from a URL with no
  `.pdf` in it relies on the content script alone.

## Check

Open `test.html` in a browser. It prints **PASS** or lists what broke, and covers:

- light/dark detection across known colours, including transparent
- the speed ramp — starts at `V0`, accelerates, caps at `VMAX`, obeys `Shift`
- movement maths — diagonals normalised, edge clamping, overshoot handed to scroll,
  and a long stall between frames capped instead of teleporting the cursor
- the key loop — `Enter` clicking the element underneath (including while a text field
  elsewhere holds focus, the case that made it look dead), a text field under the cursor
  keeping `Enter` so forms submit, `Space` still typing while typing, held keys starting
  and stopping the loop, `Esc` stepping out of a field and then cleaning up
- the ring being drawn exactly where it clicks, even inside a positioned, padded
  ancestor — otherwise you aim at a link and hit whatever is 30 px away
- **icon buttons**: the hit lands on the `<svg>`/`<path>` inside, which has no `click()`
  method at all, so the click is dispatched as real events instead. Also checked: links
  still follow their `href`, buttons inside shadow roots are reachable, the sequence is
  `pointerdown, mousedown, pointerup, mouseup, click` in that order, and exactly one
  click fires — never a double
- the popup labels, including the regression where they waited on a message and so
  said nothing at all
- **double injection** — both content scripts are deliberately loaded twice in the test
  page, then checked for exactly one cursor, one stylesheet, and two *completed* runs.
  The completed-run count is the important one: at top level the second run died on a
  redeclaration, and that fight is what put two cursors on screen.

Frame timestamps are injected rather than awaited, so a throttled background tab cannot
make a passing build look broken. Run it after touching `luminanceOf`, `DARK_BELOW`,
`advance`, `speedAt` or the media rules.

## Files

| File | Role |
|------|------|
| `manifest.json` | MV3 manifest: all-URL content scripts, popup, both shortcuts |
| `dark.js` | Dark mode — CSS, luminance detection, per-site toggle |
| `cursor.js` | Keyboard cursor — movement maths, hover and click, session state |
| `sw.js` | Routes shortcuts and popup clicks to the page, injecting first if needed |
| `popup.html` / `popup.js` | The two buttons |
| `test.html` | Self-check for all three |
