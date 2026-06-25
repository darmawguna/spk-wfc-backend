# waspas-engine

## ADDED Requirements

### Requirement: Trigger calculation
The system MUST expose `POST /api/waspas/calculate` executing the five-step WASPAS algorithm and persisting results to `waspas_results` via upsert.

#### Scenario: Happy path
- **WHEN** the endpoint is called with a complete dataset (10 cafes, 6 criterias, 60 values, `SUM(bobot) = 1.00`)
- **THEN** the endpoint returns `200` with `{ calculated_at, results: [...] }` where `results` is sorted by `ranking` ascending and each entry matches the shape `{ ranking, cafeId, cafe: { kode, nama }, wsm, wpm, qi }`. Both `cafeId` and the nested `cafe` object are returned so the frontend can either join by id or render the cafe fields directly without an extra lookup.

#### Scenario: Reference parity
- **WHEN** the calculation runs against the PRD seed data
- **THEN** the output for every alternative matches the PRD section 4.5 reference table within ±0.0001 for `wsm`, `wpm`, and `qi`

#### Scenario: Empty result cache prior to first calculation
- **WHEN** `GET /api/waspas/results` is called before any calculation
- **THEN** the endpoint returns `200` with `data.results: []` and `calculated_at: null`

### Requirement: Retrieve cached ranking
The system MUST expose `GET /api/waspas/results` returning the last persisted ranking without re-running the engine.

#### Scenario: Results available
- **WHEN** at least one `waspas_results` row exists
- **THEN** the endpoint returns all rows sorted by `ranking` ascending; each row includes `cafeId`, nested `cafe: { kode, nama }`, `wsm`, `wpm`, `qi`, `ranking`, and `calculatedAt`

#### Scenario: Optional detail
- **WHEN** the query string `?include_detail=true` is present
- **THEN** each result entry additionally includes a `detail` array with per-criteria normalization values: `{ criteria: { kode, nama, satuan, jenis, bobot }, nilai_asli, normalisasi, wsm_kontribusi, wpm_kontribusi }`

### Requirement: Per-cafe calculation detail
The system MUST expose `GET /api/waspas/results/:cafe_id` returning the full breakdown for one cafe: per-criteria original value, normalized value, and contributions to WSM and WPM.

#### Scenario: Cafe ranked
- **WHEN** the cafe has a `waspas_results` row
- **THEN** the endpoint returns `{ cafeId, cafe, detail: [...], wsm, wpm, qi, ranking }` with one entry per criteria ordered by `criteria.urutan`. The detail entry MUST include `nilai_asli` so the user page can render the original raw value, and `normalisasi` rounded to 4 decimal places so it is consistent with the calculation matrix.

#### Scenario: Cafe not in results
- **WHEN** the cafe has no row in `waspas_results`
- **THEN** the endpoint returns `404` with `message: "Belum ada hasil perhitungan untuk cafe ini"`

### Requirement: Top-1 recommendation with advantages
The system MUST expose `GET /api/waspas/recommendation` returning the highest-ranked cafe plus up to three generated `keunggulan` strings.

#### Scenario: Recommendation available
- **WHEN** `waspas_results` contains at least one row
- **THEN** the endpoint returns `200` with `{ cafeId, cafe, qi, ranking, unggulan: [string, string, string] }` where each string follows the format `"<k.nama> (<raw nilai> <satuan>)"`. `cafeId` is included so the user page can link to a future `/detail/{cafeId}` page.

#### Scenario: No calculation yet
- **WHEN** `waspas_results` is empty
- **THEN** the endpoint returns `200` with `data: null` and `message: "Belum ada hasil perhitungan"`

### Requirement: Frontend criteria config compatibility
The recommendation and per-cafe detail endpoints MUST return every criteria metadata field that the frontend needs to render the criteria card without hardcoded lookups: `{ kode, nama, satuan, jenis, bobot }`. The frontend `RekomendasiTerbaik.tsx` currently has a `kriteriaConfig` map keyed by criteria id 1-6 with hardcoded icons and labels; this endpoint exists so the frontend can replace that map with backend-driven data once the change is integrated.

#### Scenario: Recommendation response has full criteria metadata
- **WHEN** the recommendation endpoint is called after a successful calculation
- **THEN** each `detail` entry (when `?include_detail=true`) carries the `satuan` and `jenis` fields the user page needs to format the raw value (e.g. `Mbps`, `km`, `Rp`) and pick the icon category (benefit vs cost)

### Requirement: Calculation purity
The `WaspasEngine` module MUST be a pure function that takes a `{ cafes, criterias, values }` snapshot and returns `{ normalizedMatrix, wsm, wpm, qi, ranking, calculatedAt }` with no I/O, no logging side effects, and no database access. The HTTP layer is responsible for fetching the snapshot and persisting the result.

#### Scenario: Engine called twice with same input
- **WHEN** `calculate(snapshot)` is invoked twice with identical inputs
- **THEN** both calls return deeply equal outputs and neither invocation touches any external resource (database, filesystem, network)

#### Scenario: Engine has no database import
- **WHEN** the engine module is imported and its dependencies are inspected
- **THEN** the dependency graph contains no `@prisma/client` import and no `fs` / `fetch` calls