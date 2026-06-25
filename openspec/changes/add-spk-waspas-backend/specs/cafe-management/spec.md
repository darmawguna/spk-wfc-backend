# cafe-management

## ADDED Requirements

### Requirement: List all cafes
The system MUST expose `GET /api/cafes` returning every cafe ordered by `kode` ascending.

#### Scenario: Empty database
- **WHEN** no cafes exist
- **THEN** the endpoint returns `200` with `{ success: true, data: [] }`

#### Scenario: Cafes present
- **WHEN** 10 cafes exist (the PRD seed set)
- **THEN** the response includes exactly 10 entries in the shape `{ id, kode, nama, alamat, linkMaps, photo }` sorted by `kode`. Fields `linkMaps` and `photo` are nullable; the JSON key MUST be present (with `null`) so the frontend type `Cafe` keeps a stable shape.

### Requirement: Create a cafe
The system MUST expose `POST /api/cafes` accepting `{ kode, nama, alamat, linkMaps?, photo? }` and persisting a new row. `linkMaps` and `photo` MUST be stored as nullable strings; empty string and `null` are treated identically.

#### Scenario: Valid input
- **WHEN** a request supplies a unique `kode` (max 5 chars), `nama` (max 100 chars), `alamat`, and an optional `linkMaps` URL plus optional `photo` path
- **THEN** the endpoint returns `201` with `{ success: true, data: <newCafe> }` including the stored `linkMaps` and `photo` values

#### Scenario: Duplicate kode
- **WHEN** a request supplies a `kode` that already exists
- **THEN** the endpoint returns `422` with `errors.kode: ["kode already exists"]`

#### Scenario: Missing required field
- **WHEN** a request omits `nama`
- **THEN** the endpoint returns `422` with `errors.nama: ["required"]`

#### Scenario: Invalid linkMaps URL
- **WHEN** a request supplies `linkMaps` that is not a valid `http` or `https` URL
- **THEN** the endpoint returns `422` with `errors.linkMaps: ["must be a valid http(s) URL"]`

### Requirement: Update a cafe
The system MUST expose `PUT /api/cafes/:id` accepting the same payload as create and replacing the matching row.

#### Scenario: Cafe exists
- **WHEN** a request targets an existing cafe id with valid fields
- **THEN** the endpoint returns `200` with the updated row

#### Scenario: Cafe not found
- **WHEN** a request targets a non-existent id
- **THEN** the endpoint returns `404` with `{ success: false, message: "Cafe tidak ditemukan" }`

### Requirement: Delete a cafe with cascade
The system MUST expose `DELETE /api/cafes/:id` removing the cafe and every row referencing it in `alternative_values` and `waspas_results`, atomically.

#### Scenario: Cafe with values
- **WHEN** a cafe with related `alternative_values` and `waspas_results` rows is deleted
- **THEN** the endpoint returns `200` and a subsequent `GET /api/values` shows zero rows referencing that cafe id

#### Scenario: Cafe not found
- **WHEN** the target id does not exist
- **THEN** the endpoint returns `404`