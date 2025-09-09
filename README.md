# mc-parts

This project was created with [Better‑T‑Stack](https://github.com/AmanVarshney01/create-better-t-stack) and extended for MC Parts — a data‑table interface to ingest, validate, fix, and sync motorcycle/moped product data with Ny E‑handel.

## Features / Stack

- **React 19 + Next.js 15** — App Router, Route Handlers
- **TypeScript ≥ 5.3** — strict, end‑to‑end typing
- **Bun** — runtime and package manager
- **tRPC** — type‑safe server API (apps/server)
- **Drizzle + PostgreSQL** — schema + migrations (local Postgres for dev; Supabase cloud later)
- **Biome** — lint/format; **Husky** — git hooks
- **shadcn/ui + Tailwind** — UI kit
- **TanStack** — Query, Table, Virtual for high‑perf data tables
- **cmdk** — command palette; **react-hotkeys-hook** — keyboard shortcuts; **sonner** — toasts
- **nuqs** — URL state for filters/sort/pagination
- **Search** — Typesense (preferred) or Supabase full‑text
- **Ny E‑handel integration** — OpenAPI at `.cursor/docs/nyehandel/nyehandel.openapi.json`, codegen types + Zod client

## Getting Started

First, install the dependencies:

```bash
bun install
```
## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/server/.env` file with your PostgreSQL connection details.

3. Apply the schema to your database:
```bash
bun db:push
```


Then, run the development servers:

```bash
bun dev
```

Open [http://localhost:3001](http://localhost:3001) for web, [http://localhost:3000](http://localhost:3000) for API, and [http://localhost:4000](http://localhost:4000) for docs.





## Project Structure

```
mc-parts/
├── apps/
│   ├── web/           # Frontend (Next.js) — data-table UI
│   ├── server/        # Backend API (Next, tRPC, Drizzle)
│   └── fumadocs/      # Documentation site (Next)
├── src/integrations/nyehandel/generated/  # OpenAPI types + Zod client
├── scripts/nyehandel/  # Introspection utilities
├── data/nyehandel/snapshots/  # Captured payloads + inferred schemas
└── .cursor/docs/nyehandel/    # OpenAPI + architecture docs
```

## Available Scripts

- `bun dev`: Start all applications in development mode
- `bun build`: Build all applications
- `bun dev:web`: Start only the web application
- `bun dev:server`: Start only the server
- `bun check-types`: Check TypeScript types across all apps
- `bun db:push`: Push schema changes to database
- `bun db:studio`: Open database studio UI
- `bun check`: Run Biome formatting and linting

Ny E‑handel helpers
- `bun run ny:introspect` — snapshot products/categories/variants and infer Zod
- `bun run gen:nye` — regenerate OpenAPI types and Zod client from `.cursor/docs/nyehandel/nyehandel.openapi.json`

## Plan: Data‑table MVP

Milestone 1 — Shell and plumbing
- Install libs: `@tanstack/react-table`, `@tanstack/react-virtual`, `@tanstack/react-query`, `cmdk`, `react-hotkeys-hook`, `sonner`, `nuqs`
- Create `/parts` route with virtualized table, fake data, sorting/filtering, pagination in URL (nuqs)
- Keyboard basics (row navigation, quick search), toasts for actions

Milestone 2 — Live data + staging
- Drizzle schema for catalog + staging; local Postgres
- Fetch products/variants from Ny E‑handel (read‑only) and show in table via TanStack Query
- CSV upload (client to server), create `import_session` + `import_row` in staging

Milestone 3 — Validation + fixes
- Column mapping UI; Zod validation pipeline; per‑cell error badges
- Inline edits re‑validate; bulk edits; undo (client‑side)

Milestone 4 — Dedupe + commit
- Dedupe groups (SKU/GTIN or OEM key), resolve conflicts
- Commit valid rows → upsert catalog (idempotent)

Milestone 5 — Search and polish
- Integrate Typesense (or Supabase FTS) for instant search
- Saved views, column pinning/resizing; command palette (cmdk)

Conventions
- **Conventional Commits** + commit lint
- Biome‑clean; no `any` in exported types; all inputs Zod‑validated
