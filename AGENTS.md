<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project memory

Before making material changes, read the relevant file in `docs/`:

- product and business context: `docs/PROJECT_CONTEXT.md`
- technical structure and data flow: `docs/ARCHITECTURE.md`
- pricing and operating rules: `docs/BUSINESS_RULES.md`
- admin, requests, orders, and team workspace: `docs/CRM.md`
- modeling estimate roadmap: `docs/AI_ESTIMATOR.md`
- local setup and production release process: `docs/DEPLOYMENT.md`
- another workstation setup: `docs/SECOND_PC_SETUP.md`
- accepted decisions and their rationale: `docs/DECISIONS.md`

Keep these documents current after significant changes. Never commit passwords,
tokens, production request data, customer files, session data, or `.env` files.
Runtime data belongs in `CATALOG_DATA_DIR`; Git contains only code, documentation,
public assets, and `.env.example` variable names.
