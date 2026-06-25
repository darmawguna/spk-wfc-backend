# Change: add-spk-waspas-backend

Add an Express + TypeScript backend for the SPK WFC WASPAS system described in `../../prd.md`. Implements every endpoint in PRD section 5 and produces WASPAS output that matches the reference table in PRD section 4.5 within ±0.0001. Adds JWT-based admin auth (deviation from PRD section 2) so cafe/kriteria/value CRUD is protected while read endpoints stay public for the user-facing pages.

## Artifacts

- `proposal.md` — Why, What Changes, Capabilities, Impact
- `design.md` — Decisions and trade-offs (Express 5 + TypeScript, SQLite-via-Prisma, pure engine, Zod, JWT auth)
- `tasks.md` — 11 task groups, ~50 actionable steps
- `specs/` — Six new capability specs:
  - `admin-auth/spec.md`
  - `cafe-management/spec.md` (includes `linkMaps` and `photo` scenarios)
  - `criteria-management/spec.md`
  - `value-management/spec.md`
  - `waspas-engine/spec.md` (includes `cafeId` field and frontend criteria config compatibility)
  - `data-integrity/spec.md`

## Validation

```bash
openspec validate add-spk-waspas-backend --strict
```

## Status

Draft. Pending review and implementation kickoff.