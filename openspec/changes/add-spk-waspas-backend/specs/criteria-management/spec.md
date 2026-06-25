# criteria-management

## ADDED Requirements

### Requirement: List all criterias
The system MUST expose `GET /api/criterias` returning every criteria row ordered by `urutan` ascending.

#### Scenario: Default response shape
- **WHEN** the endpoint is called
- **THEN** each row includes `{ id, kode, nama, jenis, satuan, bobot, urutan }` and the array is sorted by `urutan`

### Requirement: Create a criteria
The system MUST expose `POST /api/criterias` accepting `{ kode, nama, jenis, satuan?, bobot, urutan }` and persisting it.

#### Scenario: Valid input
- **WHEN** a request supplies a unique `kode`, valid `jenis` (`benefit` or `cost`), and `bobot` in `[0, 1]`
- **THEN** the endpoint returns `201` with the new row

#### Scenario: Invalid jenis
- **WHEN** a request supplies `jenis: "unknown"`
- **THEN** the endpoint returns `422` with `errors.jenis: ["must be benefit or cost"]`

### Requirement: Update a criteria with bobot-sum invariant
The system MUST expose `PUT /api/criterias/:id` accepting any subset of editable fields. If `bobot` is included, the system MUST verify that after the update `SUM(bobot)` across all criterias equals `1.00` within tolerance `±0.001`. If the invariant fails, the endpoint returns `422` with a message naming the current total.

#### Scenario: Update that keeps total at 1.00
- **WHEN** a request changes C1 `bobot` from `0.30` to `0.25` and changes C2 `bobot` from `0.20` to `0.25`
- **THEN** the endpoint returns `200` with both rows updated

#### Scenario: Update that breaks total
- **WHEN** a request changes only C1 `bobot` from `0.30` to `0.50` and leaves others unchanged
- **THEN** the endpoint returns `422` with `message: "Total bobot harus = 1.00, saat ini = 1.20"` and no rows are modified

#### Scenario: Update non-bobot field
- **WHEN** a request changes only `nama` or `satuan`
- **THEN** the endpoint returns `200` without invoking the bobot-sum check

### Requirement: Delete a criteria
The system MUST expose `DELETE /api/criterias/:id` removing the criteria row.

#### Scenario: Existing criteria
- **WHEN** a request targets a criteria id that exists
- **THEN** the endpoint returns `200` and the row is removed

#### Scenario: Criteria referenced by values
- **WHEN** a request targets a criteria that has related `alternative_values` rows
- **THEN** the endpoint returns `409` with `message: "Kriteria masih memiliki nilai alternatif, hapus nilai terlebih dahulu"`