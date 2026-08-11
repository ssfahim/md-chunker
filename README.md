# Dark Any Page

A browser extension with two independent features:

1. **Dark mode** — turns light pages dark, leaves images and video looking normal, and
   keeps text legible instead of washed out. On by default for light pages.
2. **Keyboard cursor** — a pointer you drive with the arrow keys, so you can click
   without touching the mouse. Off by default, armed per page.

Same extension runs on **macOS and Windows** — Chrome, Edge and Brave load identical
files on both. There is nothing OS-specific to build.

## Shortcuts

| Action | macOS | Windows |
|--------|-------|---------|
| Toggle the keyboard cursor | `Opt` `Shift` `C` | `Alt` `Shift` `C` |
| Toggle dark mode on this site | `Opt` `Shift` `D` (or the toolbar button) | `Alt` `Shift` `D` (or the toolbar button) |

Same shortcut turns the cursor off again. Rebind either at `chrome://extensions/shortcuts`.

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
| Arrow keys | move the cursor (28 px a press; hold the key to repeat) |
| `Shift` + arrow | move 8× as far, for crossing the page |
| `Enter` or `Space` | click whatever is under the cursor |
| `Esc` | put the cursor away |

Pushing past a viewport edge pins the cursor there and scrolls the page instead, so
nothing is out of reach. Moving also fires hover events, so dropdown menus and tooltips
open the way they do under a real mouse. Arrow keys inside a text field are left alone —
they edit text, and the cursor stays parked until you click out.

The cursor is deliberately **session-only**: it never comes back on by itself after a
reload. A mouse-replacement mode you forgot was armed is worse than one you re-arm.

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
- The cursor **clicks, it does not drag**. Sliders, canvases and drag-and-drop still
  need the mouse; that would mean synthesising a full mousedown/move/up stream.

## Check

Open `test.html` in a browser. It prints **PASS** or lists what broke. It covers the
light/dark detection on known colours, the cursor's step and edge-clamp maths, and the
real key loop — arrow moves, `Enter` clicking the element underneath, the text-field
guard, `Esc` cleaning up. Run it after touching `luminanceOf`, `DARK_BELOW`, `nextPos`
or the media rules.

## Files

| File | Role |
|------|------|
| `manifest.json` | MV3 manifest: all-URL content scripts, toolbar action, both shortcuts |
| `dark.js` | Dark mode — CSS, luminance detection, per-site toggle |
| `cursor.js` | Keyboard cursor — movement maths, hover and click, session state |
| `sw.js` | Toolbar click and the cursor shortcut → tell the page to toggle |
| `test.html` | Self-check for both features |
