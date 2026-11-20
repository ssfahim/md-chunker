## Keep everything on GitHub

Personal (non-Keyin) project: everything made for it lives on GitHub, never only on a local disk.
- Commit and push every change — code, docs, specs, plans, scripts, notes. Work not ready for `main` goes on a pushed branch (or its own folder), never local-only.
- This repo is **public**: no Claude memory files, hostnames, IPs or personal details here — those live in the private `ssfahim/jarvis-home-lab` (`claude/memory/`).
- Never commit secrets (`.env*`, keys, keystores, `local.properties`, tokens), build outputs, `node_modules`, or the user's personal media.
- Commit as `ssfahim` (`113144576+ssfahim@users.noreply.github.com`), no Claude attribution. Pushes touching `.github/workflows` need `env -u GITHUB_TOKEN git push`.
