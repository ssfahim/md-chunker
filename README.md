# md-chunker

Paste a long `.md` (or any text) file, get it split into collapsed 150-line chunks,
each with its own **Copy** button — for pasting into a chat that chokes on long input
(e.g. free-tier ChatGPT).

**Live:** https://ssfahim.github.io/md-chunker/

## Index

One branch per tool.

| Branch | Tool | Where | What it does |
|--------|------|-------|--------------|
| `main` | md-chunker | [live page](https://ssfahim.github.io/md-chunker/) · [`index.html`](https://github.com/ssfahim/md-chunker/blob/main/index.html) | Paste text → collapsed N-line chunks with per-chunk Copy buttons. Default 150 lines. Optional "don't split inside ``` code blocks". Dark theme. |
| `dark-any` | Dark Any Page | [branch](https://github.com/ssfahim/md-chunker/tree/dark-any) · [README](https://github.com/ssfahim/md-chunker/blob/dark-any/README.md) | Chrome/Edge/Brave extension (macOS + Windows) that darkens light pages, keeps images and video normal, and keeps text legible. Load unpacked. |

## Use

1. Open the live URL (or the local `index.html` — no server, no build, no dependencies).
2. Paste your text.
3. Set lines per chunk (default `150`).
4. Click **Split**.
5. Click **Copy** on Part 1, paste into the chat, repeat for Part 2, 3, …

Chunks stay collapsed so the Copy buttons are all visible at once; expand one only if
you want to check its contents.

## Notes

- Single self-contained HTML file. Works offline from `file://` (falls back to
  `execCommand('copy')` where the async clipboard API isn't available).
- Nothing leaves the browser — no network calls, no storage.
- The code-block option lets a chunk run past the line limit rather than cut a
  ` ``` ` fence in half.
