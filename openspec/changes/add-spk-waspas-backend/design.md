## Context

The project lives at `A:/project-personal/SPK Web/` with a Figma-Make-exported React + Vite frontend that implements the SPK WFC WASPAS system but stores all data in React Context. The PRD (`prd.md`) is the source of truth for the algorithm and API contract — the backend must produce numbers that match PRD section 4.5 exactly. The academic context is a UAS (Ujian Akhir Semester) submission, so verifiability of the calculation matters more than feature breadth.

The PRD was originally written assuming a Laravel backend. The user explicitly chose Express for this implementation, which means we keep the Laravel-friendly data model and endpoint shapes but use Node idioms (TypeScript, Zod, Prisma, Vitest). No prior backend exists; this is greenfield.

## Goals / Non-Goals

**Goals:**
- Implement every endpoint in PRD sections 5.1–5.4 with the documented request/response shapes.
- Produce WASPAS output that matches the PRD reference table within ±0.0001 for all 10 alternatives.
- Make the calculation engine a pure, side-effect-free module so it is unit-testable without a database.
- Local development works with a single command (`npm run dev`) and zero external service dependencies.
- Validation that fails fast at the API boundary, not deep inside business logic.

**Non-Goals:**
- Authentication / authorization. PRD section 2 marks login as optional and deprioritized; we skip it for this change.
- Photo upload for cafes. The frontend `Cafe` type has a `photo?: string` field but the PRD does not require it.
- Export to PDF/Excel (PRD P2 nice-to-have, out of scope here).
- Multi-tenant or row-level security.
- Production deployment configuration (Docker, CI). The README documents how to run it locally; deployment is a follow-up.
- Real-time updates (WebSocket). All responses are request/response.

## Decisions

### D1. Express 5 + TypeScript
Express is the user-requested framework. Version 5 because async error handling is built-in (no need for `express-async-errors`). TypeScript gives compile-time safety on the API contract — every endpoint's request and response has a typed Zod schema. Strict mode (`strict: true`, `noUncheckedIndexedAccess: true`) is on.

### D2. SQLite via Prisma for dev, MySQL-ready schema
The PRD declares MySQL. Setting up MySQL for local development adds friction (Docker or local install) for a UAS project. We use SQLite via Prisma because:
- Prisma schema is portable — swapping the provider to `mysql` and regenerating gives MySQL DDL.
- The four tables in PRD section 3 have no MySQL-specific features (no `ON DUPLICATE KEY UPDATE` at the schema level, no stored procedures). `UPSERT` is handled at the application layer via Prisma's `upsert`.
- The reference seed data fits in a single file (`prisma/seed.ts`).

Three intentional schema deviations from the PRD MySQL DDL, all documented here:
- `ENUM('benefit','cost')` → `String` with a check constraint in Prisma. SQLite has no native enums; we get the same guarantee via Zod at the boundary plus a Prisma `@check` on the column.
- `DECIMAL(12,4)` → `Float` in SQLite, but all numeric columns are typed `number` in TypeScript and validated to 4 decimal places on output. The calculation engine uses `number` (IEEE 754 double) which gives the precision the PRD reference table requires — confirmed by running the algorithm against the reference data during planning.
- `ON UPDATE CURRENT_TIMESTAMP` → handled by Prisma `@updatedAt`.

### D3. WASPAS engine as a pure module
`src/engine/waspas.ts` exports `calculate(masterData): WaspasResults` with zero I/O. Inputs are `{ cafes, criterias, values }`; outputs include normalized matrix, per-alternative WSM/WPM/Qi, and ranking. This makes the 12 PRD unit tests trivial: pass the seed data in, assert the numbers out, no DB or HTTP required.

### D4. Zod for validation at the route boundary
Each route mounts a `validate(schema)` middleware that calls `safeParse` and forwards 422 with field-level errors. No validation happens inside the engine or repositories. This keeps business logic testable in isolation.

### D5. Decimal handling per BR-03
The PRD is explicit: do not round intermediate normalization values. We use plain `number` arithmetic in the engine, format to 4 decimal places only at the serialization step (`toFixed(4)`), and the tolerance for tests is ±0.0001. Spot-checked A10 Qi manually:
- WSM = 0.30·0.9250 + 0.20·1.0000 + 0.15·1.0000 + 0.15·0.2500 + 0.10·0.8820 + 0.10·0.4000 = 0.7932
- WPM ≈ 0.9250^0.30 · 1.0000^0.20 · 1.0000^0.15 · 0.2500^0.15 · 0.8820^0.10 · 0.4000^0.10 ≈ 0.7150
- Qi = 0.5·0.7932 + 0.5·0.7150 = 0.7541 ✓ matches PRD.

### D6. Result caching via UPSERT (BR-04)
After calculation, results are written with `prisma.waspasResult.upsert({ where: { cafeId }, update: {...}, create: {...} })`. A repeated `/api/waspas/calculate` overwrites the previous ranking instead of accumulating rows. The `calculated_at` timestamp is set from `new Date()` on the Node process, stored as `DateTime`, returned as ISO 8601 in responses.

### D7. Recommendation `keunggulan` generation
PRD section 5.4 leaves the rule informal: "ambil 3 kriteria dengan nilai normalisasi tertinggi". We formalize it: sort criteria by normalized value descending for the top-ranked cafe, take the top three, and generate a sentence per criteria using `k.nama` + raw `nilai_asli` + `satuan`. Examples (from seed data for A10):
- `Stop kontak terbanyak (31 unit)` — because C2 normalized = 1.000 (highest, ties break by criteria `urutan`).
- `Internet cepat (96.38 Mbps)` — C1 normalized = 0.925.
- `Jarak terdekat dari kampus (0.12 km)` — C3 normalized = 1.000 (ties with C2, but C2 wins by lower `urutan`).

### D8. Admin authentication for write operations
The PRD marks login as optional, but cafe data is now dynamic — admins create, update, and delete cafes and values through the API, not via direct database access. We protect every write endpoint (POST/PUT/DELETE under `/api/cafes`, `/api/criterias`, `/api/values`, `/api/waspas/calculate`) with a JWT bearer token issued by `POST /api/auth/login`. Read endpoints (`GET /api/cafes`, `GET /api/criterias`, `GET /api/values`, `GET /api/waspas/*`) stay public so the user-facing pages work without login. Auth uses bcrypt-hashed passwords stored in a new `admins` table; tokens are signed with HS256 using a server-side secret and expire after 8 hours. Seed creates one default admin (`admin@spk.local` / `admin123`) marked for immediate password change.

This deviates from the original PRD framing of login as optional. The deviation is documented here so reviewers know auth is in scope for the backend even though the PRD section 2 marked it low priority.

### D9. Frontend compatibility shims
The frontend at `frontend-spk/` is a finished React + Vite prototype that stores data in React Context. Before integration, three contract gaps between the prototype and these specs had to be closed; the resolutions below are baked into the specs (`cafe-management`, `waspas-engine`):

- **`jenis` casing.** Frontend uses `"Benefit" | "Cost"` (PascalCase) in `src/app/context/AppContext.tsx`; PRD and these specs use lowercase `"benefit" | "cost"`. Decision: backend stores and returns lowercase. The frontend must update its type union and any switch statements (file `RekomendasiTerbaik.tsx` lines referencing `k.jenis`) when it switches to HTTP calls.
- **`Cafe` extra fields.** Frontend `Cafe` type has `linkMaps: string` (required in some call sites) and `photo?: string`. The PRD only specifies `kode`, `nama`, `alamat`. Decision: backend adds both as nullable columns on `cafes`; the spec `cafe-management` requires they always be present in JSON responses (as `null` when empty) so the frontend type stays stable. Photo upload itself is out of scope; the column is wired so a future change can add file handling.
- **`WaspasResult` shape.** Frontend shape is `{ cafeId, wsm, wpm, qi }`; spec adds nested `cafe: { kode, nama }` and `ranking`. Decision: backend returns both `cafeId` and the nested `cafe` object in every WASPAS response. Frontend can map by id (no lookup) or by nested object (render directly). This avoids breaking the existing frontend shape and gives the ranking field it currently derives manually by sorting.
- **Hardcoded `kriteriaConfig` in user page.** `src/app/pages/user/RekomendasiTerbaik.tsx` has a `kriteriaConfig` keyed by criteria id 1-6 with hardcoded icons, labels, and units. Backend now returns `satuan` and full criteria metadata on every recommendation/detail response; the frontend migration task is to delete `kriteriaConfig` and render from backend data.
- **Frontend `/daftar-cafe` route.** Not in PRD section 6 routing. No backend change needed; the existing `GET /api/cafes` (public) serves the page. Documented here so reviewers know the route is a frontend-only addition.

These shims keep the prototype's data contracts valid while the frontend migration happens in a separate change. No backend field is added speculatively — every addition maps to a field the frontend already uses.

## Risks / Trade-offs

- **SQLite vs MySQL.** Dev runs on SQLite; if production deployment uses MySQL, the Prisma provider switch is one line but a staging environment must re-run all migration + seed + calculation against real MySQL to confirm the reference table still holds. The PRD `nilai_asli` integers (e.g. `5000` for price, `31` for sockets) and `DECIMAL(12,4)` for normalized values may round-trip differently in MySQL `DECIMAL`. Mitigation: the engine uses JS `number`, so the calculation is identical; only storage changes.
- **WPM floating-point drift.** With many small criteria the WPM product can underflow. For 6 criteria and the PRD seed data, the smallest WPM (A5) is 0.1490 which is well within safe range. If criteria are added beyond 10, recommend logging the smallest WPM and warning below `1e-10`.
- **No transactions on cascade delete.** Deleting a cafe removes from `alternative_values` and `waspas_results` via Prisma's `onDelete: Cascade` on the foreign keys. This is a single statement in Prisma, but if either delete fails partway we rely on SQLite/transactional Prisma calls to roll back. Mitigation: wrap deletes in `prisma.$transaction([...])`.
- **Single-process Node.** No clustering. Fine for a UAS-scale workload (10 alternatives, 6 criteria). For real production, run behind PM2 or container orchestrator.
- **OpenSpec schema is `spec-driven`** — proposal → specs → design → tasks. The artifacts here follow that order, but design.md is included even though the spec-driven schema technically allows it to come after tasks. We include it early because the PRD has decisions that need to be locked before tasks are written (SQLite choice, decimal handling).