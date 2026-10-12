<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project Docs

Full project specs and working rules live in [docs/CLAUDE.md](docs/CLAUDE.md) and the rest of [docs/](docs/) — read that before making product, data, or security decisions in this repo. The single rule that overrides everything else: **facility accuracy** — never present a game, price, event, or booking slot as available unless it has verified, owner-confirmed data behind it.
