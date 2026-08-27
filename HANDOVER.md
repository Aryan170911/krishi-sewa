# Krishi Sewa — Session Handover (Build Mode)

> **Date:** 2026-08-28
> **For:** Continuation by another AI session
> **Live:** https://krishi-sewa.onrender.com
> **Admin:** https://krishi-sewa.onrender.com/admin (`admin` / `admin123`)

## Status: Stable, all major work shipped

## What's working (last deploy: `e3219eb`)

### Frontend
- Floating help ball + support chat (multi-chat list, typing indicator, optimistic send)
- Mobile bottom nav (Home/Shop/Saved/Cart/Profile) + mobile drawer
- Wishlist with heart button on every product card
- Cart sync to server on every change (NO localStorage)
- Orders list (server-source-of-truth, no offline saves)
- Order tracking modal with full event timeline
- Order confirmation with order events timeline
- Profile tabs: Addresses, Wishlist, Sessions, Preferences, **Danger Zone** (delete account)
- Saved addresses auto-fill on checkout
- Newsletter signup (localStorage list)
- Search page with full-text via /api/search
- Auth pages: login, signup (with password strength), verify OTP, forgot/reset password
- Hard logout: clears ALL local data on logout
- Soft delete account: anonymizes email/name, deletes cart/wishlist/prefs/sessions, soft-deletes orders/chats
- Loading skeletons on home + shop
- Global error boundary (uncaught errors show friendly page)
- Render-level try/catch
- Offline detection banner (red banner when offline, auto-resync on reconnect)
- Skip-to-content link for keyboard users
- Lazy loading images (loading="lazy", decoding="async")
- Pull-to-refresh-style login → server data hydration

### Backend
- 50+ endpoints across auth, products, orders, addresses, cart, wishlist, support, admin, webhooks
- Server-side session tracking with cookies
- Account lockout: 5 failed logins = 15 min lock
- Password reset via secure token (hashed in DB)
- Email verification (token flow)
- Email notifications logged to `email_notifications` table on order events
- Webhooks (HMAC-signed) fire on order.created, order.{status}
- API keys for programmatic admin access
- Soft delete everywhere with `deleted_at` columns
- 27 Supabase tables, 3 views, 85 indexes, 18 CHECK constraints, 9 triggers
- Append-only audit log (triggers block UPDATE/DELETE)
- Full-text search (tsvector + GIN index) via search_products() RPC
- Order events table for status history
- Request ID middleware (X-Request-Id header on every response)
- Security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- Rate limiting on /api/auth/login (5/min)

## DB schema
27 tables, all with RLS. Service role bypasses RLS. Anon users can only read in-stock products.

## API health
- 15/15 smoke tests passing (server/test-api.cjs)
- No known bugs

## Recent commits this session
```
e3219eb feat(auth): include email_verified status in /api/auth/me response
f504fc4 feat(orders): track order timeline + lazy load images + better empty states
746fd50 feat(a11y): skip to content link for keyboard users
75192c7 feat(ux): offline detection banner + auto-resync
9c6be77 feat(ux): error boundary, loading skeletons, security hardening
0bdfd62 feat(db): make cart/orders fully online (no offline saves)
2b5db4a feat(security): hard logout + delete account
```

## Environment
- No AgentRouter (cleaned up). Only Anthropic env vars (none currently set on system)
- Render API key in `set-render-env.ps1` (gitignored)
- Supabase DB password: `Aryan@709124` (NOT in env, used by run-sql.cjs only)

## Next steps (if more time)
1. Add real-time typing indicator backend (use support_typing table)
2. Add email verification banner in UI (using email_verified flag from /api/auth/me)
3. Add image upload via Supabase Storage
4. Replace admin token auth with cookie-based
5. Add proper test suite (currently only smoke tests)
6. Add rate limiting to more endpoints
7. Add CSRF protection
8. Implement 2FA

## Critical files
- `krishi-sewa-frontend/assets/app.js` (~4250 lines) — entire user app
- `krishi-sewa-frontend/assets/admin.js` (~750 lines) — admin panel
- `server/server.js` (~1950 lines) — Express backend with all endpoints
- `sql_1..sql_5` — initial schema
- `sql_6_hardening.sql` — CHECK/INDEX/TRIGGER
- `sql_7_verify.sql` — verification queries
- `sql_8_full_system.sql` — 19 more tables + RLS + search
- `sql_9_search_rpc.sql` — search_products() RPC function
- `server/test-api.cjs` — smoke tests (15 tests)
- `server/run-sql.cjs` — env-based SQL runner
- `server/check-db.cjs` — DB integrity check
- `server/verify-system.cjs` — DB system verify
- `HANDOVER.md` — this file
- `AGENTS.md` — original AI agent guide
