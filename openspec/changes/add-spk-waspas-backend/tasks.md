## 1. Bootstrap project skeleton

- [x] 1.1 Create `backend-spk/package.json` with name `@spk/backend`, scripts (`dev`, `build`, `start`, `test`, `db:migrate`, `db:seed`, `db:reset`), and dependencies: `express@^5`, `@prisma/client`, `prisma` (dev), `zod`, `cors`, `dotenv`, `bcryptjs`, `jsonwebtoken`. Dev deps: `typescript`, `tsx`, `@types/express`, `@types/cors`, `@types/node`, `@types/bcryptjs`, `@types/jsonwebtoken`, `vitest`, `supertest`, `@types/supertest`.
- [x] 1.2 Add `tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess: true`, `target: ES2022`, `module: NodeNext`, `moduleResolution: NodeNext`, `outDir: dist`.
- [x] 1.3 Add `.gitignore` covering `node_modules`, `dist`, `.env`, `prisma/dev.db*`.
- [x] 1.4 Add `.env.example` with `DATABASE_URL="file:./dev.db"`, `PORT=3001`, `CORS_ORIGIN=http://localhost:5173`, `JWT_SECRET="change-me-in-production-min-32-chars"`, `JWT_EXPIRES_IN="8h"`.
- [x] 1.5 Add README with quick start (`npm install`, `npx prisma migrate dev`, `npm run db:seed`, `npm run dev`), endpoint list, default admin credentials, and curl example for `POST /api/auth/login` followed by `POST /api/waspas/calculate`.

## 2. Database schema and seed

- [x] 2.1 Create `prisma/schema.prisma` with provider `sqlite` and models `Admin`, `Cafe`, `Criteria`, `AlternativeValue`, `WaspasResult`. Cafe/Criteria/AlternativeValue/WaspasResult match PRD section 3 (with the documented deviations: `jenis: String` not enum, `nilai: Float` not Decimal, `onDelete: Cascade` on foreign keys). `Admin` has `email` (unique, lowercase), `passwordHash`, `nama`, timestamps. `Cafe` adds nullable `linkMaps String?` and `photo String?` per design decision D9 (frontend compatibility).
- [x] 2.2 Run `npx prisma migrate dev --name init` to generate the initial migration and `dev.db`.
- [x] 2.3 Create `prisma/seed.ts` that inserts the default admin (`admin@spk.local` / bcrypt of `admin123`), the 10 cafes (with `linkMaps` set to `https://maps.google.com/?q=<nama>` for each row, `photo: null`), 6 criterias, and 60 alternative values exactly as PRD sections 3.1–3.3 specify. Idempotent: wipe and re-insert on each run.
- [x] 2.4 Verify seed with a small script or `npx prisma studio` that prints row counts and a sample cafe and admin.

## 3. Server bootstrap and shared middleware

- [x] 3.1 Create `src/server.ts` that boots Express on `PORT`, mounts `cors`, `express.json()`, request logging, and `/health`.
- [x] 3.2 Create `src/app.ts` exporting the configured Express app (without `.listen`) so tests can mount it via supertest.
- [x] 3.3 Create `src/middleware/validate.ts` accepting a Zod schema and returning middleware that calls `safeParse`, writing 422 on failure.
- [x] 3.4 Create `src/middleware/error.ts` translating thrown errors to `{ success: false, message, errors? }` with the right HTTP status (404, 409, 422, 500).
- [x] 3.5 Create `src/middleware/requireAdmin.ts` reading the bearer token, verifying with `JWT_SECRET`, and attaching `req.admin`. Returns 401 on missing/expired/invalid tokens.
- [x] 3.6 Create `src/lib/prisma.ts` exporting a singleton Prisma client.
- [x] 3.7 Create `src/lib/env.ts` validating `JWT_SECRET` is at least 32 chars at boot, throwing a clear error otherwise.

## 3a. Admin auth routes

- [x] 3a.1 Create `src/repositories/adminRepository.ts` with `findByEmail` (case-insensitive lookup), `findById`, `create`, `updatePassword`.
- [x] 3a.2 Create `src/services/authService.ts` exporting `login(email, password)` returning `{ token, admin, expiresAt }` and `changePassword(adminId, oldPw, newPw)`. Constant-time password comparison via bcrypt.
- [x] 3a.3 Create `src/routes/auth.ts` with `POST /api/auth/login` (public), `POST /api/auth/password` (protected by `requireAdmin`).
- [x] 3a.4 Add `src/__tests__/auth.routes.test.ts` covering: valid login → 200 + token; wrong password → 401 in constant time; missing token on `/api/auth/password` → 401; valid token + correct old password → 200; weak new password → 422.

## 4. WASPAS calculation engine (pure module)

- [x] 4.1 Create `src/engine/waspas.ts` exporting `calculate(input: EngineInput): EngineOutput` with no I/O. Steps: build matrix, normalize (benefit `x/max`, cost `min/x`), compute WSM, compute WPM, compute Qi with `λ = 0.5`, assign rankings by `qi` desc with `kode` asc tiebreak.
- [x] 4.2 Create `src/engine/types.ts` with `EngineInput`, `EngineOutput`, `NormalizedRow`, `AlternativeResult` types matching the spec scenarios.
- [x] 4.3 Create `src/engine/waspas.ts` with `pickKeunggulan(normalizedRows, rawValues, criterias, limit = 3)` returning strings formatted as `"<nama> (<nilai> <satuan>)"`.
- [x] 4.4 Add `src/engine/__tests__/waspas.test.ts` covering 17 tests including PRD spot-check (A10 Qi=0.7541), all ranking positions, all Qi/WSM/WPM values, tiebreak, and edge cases. Tolerance `±0.0001`.

## 5. Cafe routes

- [x] 5.1 Create `src/repositories/cafeRepository.ts` with `findAll`, `findById`, `create`, `update`, `delete` (the delete uses `prisma.$transaction` to cascade).
- [x] 5.2 Create `src/routes/cafes.ts` with `GET /api/cafes` (public), `POST /api/cafes` (Zod schema `cafeCreateSchema`, protected by `requireAdmin`), `PUT /api/cafes/:id` (protected), `DELETE /api/cafes/:id` (protected).
- [x] 5.3 Add `src/__tests__/cafes.routes.test.ts` covering PRD BT-01, BT-02, plus happy paths and 401 on every write without a token.

## 6. Criteria routes

- [x] 6.1 Create `src/repositories/criteriaRepository.ts` with `findAll` (ordered by `urutan`), `findById`, `create`, `update`, `delete` (returns 409 if `alternative_values` reference it).
- [x] 6.2 Create `src/services/bobotValidator.ts` exporting `assertBobotSumEqualsOne(excludeId?, newBobot?)` returning the new total or throwing a `BobotSumError`.
- [x] 6.3 Create `src/routes/criterias.ts` with `GET /api/criterias` (public), `POST /api/criterias` (protected), `PUT /api/criterias/:id` (invokes `bobotValidator` when `bobot` is in the body, protected), `DELETE /api/criterias/:id` (protected).
- [x] 6.4 Add `src/__tests__/criterias.routes.test.ts` covering PRD BT-03, bobot-sum invariant, and 401 on writes without a token.

## 7. Value routes

- [x] 7.1 Create `src/repositories/valueRepository.ts` with `findAll` (joining cafe and criteria), `upsert`, `batchUpsert` (uses `$transaction`).
- [x] 7.2 Create `src/routes/values.ts` with `GET /api/values` (public), `POST /api/values` (single upsert, protected), `POST /api/values/batch` (protected).
- [x] 7.3 Add `src/__tests__/values.routes.test.ts` covering single + batch upsert, FK rejection, and 401 on writes without a token.

## 8. WASPAS routes

- [x] 8.1 Create `src/repositories/waspasRepository.ts` with `findAll` (sorted by `ranking`), `findByCafeId`, `upsertMany`.
- [x] 8.2 Create `src/services/calculateService.ts` that fetches the snapshot, runs pre-flight checks (bobot sum, full coverage, non-zero cost values), calls the engine, and persists results.
- [x] 8.3 Create `src/routes/waspas.ts` with `POST /api/waspas/calculate` (protected), `GET /api/waspas/results` (public), `GET /api/waspas/results/:cafe_id` (public), `GET /api/waspas/recommendation` (public).
- [x] 8.4 Add `src/__tests__/waspas.routes.test.ts` covering PRD BT-04..BT-07, integration check that the engine output matches the PRD reference table for all 10 cafes, and 401 on `POST /api/waspas/calculate` without a token.

## 9. End-to-end verification

- [x] 9.1 Add `src/smoke.ts` (via `npm run smoke`) that boots the server, seeds DB, calls `POST /api/waspas/calculate`, and asserts A10 has `ranking: 1, qi: 0.7541`.
- [x] 9.2 Add `src/engine/check-reference.ts` (via `npm run check-reference`) that runs the engine against the PRD seed data and exits non-zero if A10 deviates by more than `±0.0001`.
- [x] 9.3 `npm run build` — TypeScript compiles clean under strict mode (0 errors).
- [x] 9.4 `npm test` — ✅ 47/47 tests passing (17 engine + 30 integration)

## 10. Documentation

- [x] 10.1 Document every endpoint in `README.md` with method, path, request shape, response shape, errata, and a curl example matching the PRD section 5 examples. Include `linkMaps` and `photo` in the cafe response examples and nested `cafe` in the WASPAS examples.
- [x] 10.2 Add `docs/algorithm.md` explaining the five WASPAS steps in plain language with the full reference table from PRD section 4.
- [x] 10.3 Add `docs/migration-to-mysql.md` with the exact `schema.prisma` change and `prisma migrate` commands needed to switch the dev provider to MySQL.
- [x] 10.4 Add `docs/frontend-integration.md` enumerating the contract, endpoint shapes, auth flow, and the `VITE_USE_LOCAL` flag.