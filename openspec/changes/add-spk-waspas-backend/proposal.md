## Why

The frontend (`A:/project-personal/SPK Web/`) currently holds all SPK data in React Context state in memory. Every page refresh resets the dataset, the WASPAS calculation is duplicated across components, and there is no shared source of truth for the reference table that the academic supervisor validates against. The PRD (`prd.md`) already specifies the full data model, algorithm, and endpoint surface but no backend exists yet.

This change introduces the backend that the PRD assumes: a single Express service that owns the data, runs the WASPAS engine with reference-validated outputs, and exposes the documented JSON API. Once this lands, the frontend can drop its in-memory seed data, replace each `setCafes` / `setKriteria` / `setNilaiAlternatif` call with HTTP, and trust that `Qi` numbers match `prd.md` section 4.5 exactly.

## What Changes

- New Node.js + Express 5 + TypeScript service in `backend-spk/`.
- SQLite database via Prisma (zero-config dev) with the five tables: `admins`, `cafes`, `criterias`, `alternative_values`, `waspas_results`. `cafes` carries nullable `linkMaps` and `photo` columns so the frontend's existing `Cafe` type stays valid during integration.
- Seed script that loads the default admin (`admin@spk.local`), 10 cafes, 6 criterias, and 60 values from PRD sections 3.1–3.3.
- `WaspasEngine` pure module with the 5 calculation steps. Output is byte-identical to PRD section 4.5 within ±0.0001 tolerance, and every response shape includes both `cafeId` and the nested `cafe: { kode, nama }` object so the frontend can map without an extra lookup.
- REST endpoints under `/api` covering every section 5.1–5.4 endpoint in the PRD plus health check, plus `POST /api/auth/login` and `POST /api/auth/password` for admin auth.
- Zod request validation on every POST/PUT/PATCH.
- Vitest unit suite covering all 12 PRD `TEST-01..TEST-12` cases, the 7 black-box cases, and 5 auth cases (login success/failure, missing/expired/invalid token).
- `.env.example` (with `JWT_SECRET` and `JWT_EXPIRES_IN`), npm scripts (`dev`, `build`, `start`, `test`, `db:seed`, `db:reset`).
- README with curl examples mirroring the PRD response shapes; `docs/frontend-integration.md` enumerating the contract gaps from design decision D9.

## Capabilities

### New Capabilities
- `admin-auth`: JWT-based admin authentication with bcrypt-hashed passwords, login + password change endpoints, and a `requireAdmin` middleware protecting all write routes. Read routes stay public.
- `cafe-management`: CRUD operations on cafes plus cascade-delete behavior to `alternative_values` and `waspas_results`.
- `criteria-management`: Read all criterias ordered by `urutan`; update criteria fields with a hard rule that `SUM(bobot) = 1.00` after each write.
- `value-management`: Single and batch upsert of `alternative_values`; reject negative or non-numeric `nilai`.
- `waspas-engine`: The five-step calculation (matrix → normalize → WSM → WPM → Qi), persisted ranking, per-cafe detail breakdown, top-1 recommendation with generated `keunggulan` strings.
- `data-integrity`: Cross-resource guards enforced at calculate time — bobot sum, full matrix coverage, and non-zero `cost` values.

### Modified Capabilities
None. This is a brand-new backend, no prior OpenSpec specs exist for this repo.

## Impact

- New repo area: `backend-spk/` (Node, TypeScript, Prisma, Vitest). No production runtime shared with frontend yet — frontend stays untouched in this change.
- Dependencies added to root workspace (if workspace enabled later): none. `backend-spk/` will carry its own `package.json`.
- Dev-time: needs Node 20+, `npm install`, `npx prisma migrate dev`, `npm run db:seed`.
- Schema alignment: matches PRD section 3 MySQL DDL with three adaptations documented in `design.md` (SQLite, Prisma models, integer-vs-decimal). Adds one table not in the PRD (`admins`) for the now-required authentication layer.
- Auth scope: every POST/PUT/DELETE under `/api/cafes`, `/api/criterias`, `/api/values`, `/api/waspas/calculate` requires a valid JWT. GET routes remain public. This deviates from PRD section 2 (which marked login optional) and is documented in `design.md` decision D8.