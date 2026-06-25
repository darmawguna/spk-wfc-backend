# data-integrity

## ADDED Requirements

### Requirement: Bobot sum must equal 1.00 before calculation
The system MUST reject `POST /api/waspas/calculate` with HTTP `422` when `SUM(bobot)` across all criterias is not within `±0.001` of `1.00`. The error payload MUST include `message: "Total bobot harus = 1.00, saat ini = X.XX"`.

#### Scenario: All seed weights sum to 1.00
- **WHEN** the seed bobot values 0.30 + 0.20 + 0.15 + 0.15 + 0.10 + 0.10 = 1.00 are loaded
- **THEN** calculation is permitted

#### Scenario: One weight edited away from 1.00
- **WHEN** an admin edits C1 `bobot` to `0.50` without compensating
- **THEN** the calculate endpoint returns `422` with the bobot-sum error and writes no rows to `waspas_results`

### Requirement: Full matrix coverage required
The system MUST reject `POST /api/waspas/calculate` with HTTP `422` when any cafe is missing a value for any criteria. The error payload MUST include a `missing` array listing every `{ cafe, criteria }` pair that has no row in `alternative_values`.

#### Scenario: All 60 cells populated
- **WHEN** every (cafe × criteria) combination has a row
- **THEN** calculation proceeds

#### Scenario: At least one cell missing
- **WHEN** cafe A3 has no value for C2
- **THEN** the calculate endpoint returns `422` with `missing: [{ cafe: "A3", criteria: "C2" }]` and writes no rows

### Requirement: Cost criteria values must be non-zero
The system MUST reject `POST /api/waspas/calculate` with HTTP `422` if any cafe has `nilai = 0` for a criteria of type `cost`, because the normalization formula `min/x` would divide by zero.

#### Scenario: Cost value zero
- **WHEN** cafe A5 has `nilai = 0` for C3 (`Jarak dari Kampus`, cost)
- **THEN** the calculate endpoint returns `422` with `message: "Nilai cost tidak boleh 0 (cafe: A5, criteria: C3)"`

#### Scenario: All cost values non-zero
- **WHEN** every cost-type value is greater than zero
- **THEN** calculation proceeds

### Requirement: Lambda parameter is fixed at 0.5
The system MUST use `λ = 0.5` in the Qi formula `Qi = λ · WSM + (1 − λ) · WPM`. The endpoint MUST NOT accept a lambda parameter; it is a server-controlled constant matching PRD section 4.5.

#### Scenario: Calculate request without lambda
- **WHEN** the calculate endpoint is called with no body
- **THEN** the engine uses `λ = 0.5` and the response Qi matches the PRD table

### Requirement: Ranking written as integer
The system MUST store `ranking` in `waspas_results` as an integer in the range `[1, n]` where `n` is the number of cafes. Ties are broken by `cafe.kode` ascending; the engine MUST NOT assign the same rank to two cafes.

#### Scenario: Ten unique rankings
- **WHEN** 10 cafes are ranked
- **THEN** the persisted `ranking` column contains exactly the integers 1 through 10 with no duplicates and no gaps

### Requirement: Cascade delete from cafes
The system MUST delete all `alternative_values` and `waspas_results` rows referencing a cafe when that cafe is deleted, within a single transaction.

#### Scenario: Cafe with full data
- **WHEN** a cafe with 6 `alternative_values` rows and 1 `waspas_results` row is deleted
- **THEN** after the transaction commits, zero rows reference that cafe in either table