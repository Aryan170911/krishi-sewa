# AGENTS.md

Compact guide for AI agents working on Krishi Sewa. Read `HANDOVER.md` (full architecture) and `PROGRESS.md` (release history) before starting.

## Stack

- **Backend:** Node 24 + Express 4, single file `server/server.js` (~1900 lines). Serves both API (`/api/*`) and static frontend on one port.
- **Frontend:** Vanilla JS SPA, single file `krishi-sewa-frontend/assets/app.js` (~3700 lines). No framework, no build step. Tailwind via CDN. Hash routing.
- **Admin:** Separate SPA at `/admin` — `krishi-sewa-frontend/admin.html` + `assets/admin.js`.
- **DB:** Supabase Postgres (primary) with local JSON fallback (`server/data/*.json`) when `SUPABASE_URL` is unset.
- **Email:** Resend. **Payments:** Razorpay (test mode keys only — `test_secret_for_demo`).

## Commands

```bash
# Install
cd server && npm install

# Run locally (port 3000)
node server/server.js

# Smoke tests (after server is up)
node server/test-api.cjs                    # uses http://localhost:3000/api
API_BASE=https://krishi-sewa.onrender.com/api node server/test-api.cjs

# Apply a SQL migration against Supabase
SUPABASE_DB_PASSWORD=<from .env> node server/run-sql.cjs sql_8_full_system.sql

# DB integrity / one-time fixes
SUPABASE_DB_PASSWORD=<from .env> node server/check-db.cjs
SUPABASE_DB_PASSWORD=<from .env> node server/fix-db.cjs
SUPABASE_DB_PASSWORD=<from .env> node server/verify-system.cjs

# Syntax check (no test runner)
node --check server/server.js
node --check krishi-sewa-frontend/assets/app.js
node --check krishi-sewa-frontend/assets/admin.js
```

There is no `npm test`, no lint, no typecheck, no CI workflow. Add features without breaking these expectations unless you also add the missing tooling.

## Hard rules

- **Do not paste secrets in chat or commit them.** All keys live in `.env` (gitignored) or Render env vars. The DB password is `Aryan@709124` for project `xypizzylruvgcglhyiyb` — never share a real key in the chat transcript.
- **Never trust AgentRouter or any "free $X credit" LLM proxy** — it's a flagged service. Use Anthropic's official console (`https://console.anthropic.com`) for real Claude API access.
- **All orders require login.** `POST /api/orders` returns 401 without a session cookie. Do not add offline order paths back to the frontend.
- **Audit log is append-only** (DB triggers block UPDATE/DELETE). Never write code that updates/deletes `audit_log` rows.
- **27 Supabase tables** — do not rename columns without a migration. Schema is tracked in `sql_*` files in repo root, in version order (1 → 9).

## Codebase quirks

- **One-file frontend** — `app.js` is 3700+ lines of mixed render functions, state, helpers, modals, polling timers, and the support widget. Prefer adding a new function next to related code rather than refactoring wholesale.
- **`supportState` / `supportAdminState`** are global module-level objects. The user widget and the admin panel each have their own copy. Polling timers must be cleared in `stopSupportPolling()` and on `navigateTo`.
- **Two admin auth schemes coexist:**
  - `/api/admin/*` uses `x-admin-token` header (set via localStorage in `admin.js`).
  - `/api/admin/support/*` uses HttpOnly cookie set by `/api/admin/support/login`. A second login is required for the Support tab even if you're already logged into the main admin.
- **In-memory products array** is the runtime source of truth for `GET /api/products`. On startup `syncProductsToSupabase()` pushes to DB if empty. Admin POST/PUT/DELETE writes to both `products` array AND `products` table.
- **`renderApp()` rebuilds the entire DOM** on every navigation. Event handlers must be inline `onclick` or attached after the render. The `setTimeout(..., 200)` block at the bottom of `app.js` runs once per page mount for tab/data loaders.
- **`escapeHtml()` and `timeAgo()` are defined in both `app.js` and `admin.js`** — they're local, not shared.

## SQL migration workflow

Migrations are `sql_1_*.sql` through `sql_9_search_rpc.sql`, applied in order. New schema changes go in a new `sql_N_*.sql` file. Each must be **idempotent** (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DO $$ ... $$` for constraints). The `schema_migrations` table tracks applied versions.

DB password goes through `SUPABASE_DB_PASSWORD` env var, never hardcoded in scripts (one older commit leaked it — never do that again).

## Deploy

Render auto-deploys on `git push origin main` if `render.yaml` env vars are set. Manual deploy:
```powershell
# Get key from Render dashboard, set as RENDER_API_KEY env var first
$svc = "srv-da7kohnqj5pc7384eu90"
$h = @{ Authorization = "Bearer $env:RENDER_API_KEY"; "Content-Type" = "application/json" }
Invoke-RestMethod -Uri "https://api.render.com/v1/services/$svc/deploys" -Headers $h -Method POST -Body "{}"
```
Service ID and project ID are in `HANDOVER.md` §8. Free plan (Oregon).

## Verifying changes

1. `node --check` on every modified JS file
2. Local server + `node server/test-api.cjs` for endpoint sanity
3. `git push origin main` → wait ~30s for Render deploy → `curl https://krishi-sewa.onrender.com/api/health` should show `"db": "connected"`
4. For UI changes, hard-refresh `https://krishi-sewa.onrender.com` (Ctrl+Shift+R) — browser caches `app.js` aggressively

## Files you probably want to read first

- `HANDOVER.md` — full architecture, all endpoints, known bugs, decision rationale
- `PROGRESS.md` — what's already shipped, what's "100% complete" by the user's count
- `render.yaml` — env var contract (secrets via Render dashboard, never in file)
- `.gitignore` — excludes `.env`, `OmniRoute/`, `set-render-env.ps1`, build outputs
- `server/test-api.cjs` — endpoint coverage map and expected status codes
