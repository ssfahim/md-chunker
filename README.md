# Dark Any Page

A browser extension that turns light pages dark, leaves images and video looking
normal, and keeps text legible instead of washed out.

Same extension runs on **macOS and Windows** — Chrome, Edge and Brave load identical
files on both. There is nothing OS-specific to build.

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

## Use

- Automatic on every light page.
- Click the toolbar button (or **Alt+Shift+D**) to force the current site on or off;
  the choice is remembered per hostname.

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

## Check

Open `test.html` in a browser. It asserts the light/dark detection on known colours and
prints **PASS** or a list of failures. Run it after touching `luminanceOf`, `DARK_BELOW`
or the media rules.

## Files

| File | Role |
|------|------|
| `manifest.json` | MV3 manifest: all-URL content script, toolbar action, Alt+Shift+D |
| `dark.js` | The whole feature — CSS, luminance detection, per-site toggle |
| `sw.js` | Three lines: toolbar click → tell the page to toggle |
| `test.html` | Self-check for the detection logic |
