# value-management

## ADDED Requirements

### Requirement: List all alternative values with joins
The system MUST expose `GET /api/values` returning every `alternative_values` row joined with cafe and criteria metadata.

#### Scenario: Default response shape
- **WHEN** the endpoint is called
- **THEN** each row includes `{ id, cafe: { id, kode, nama }, criteria: { id, kode, nama, satuan }, nilai }` ordered by `cafe.kode` then `criteria.urutan`

### Requirement: Create or update a single value (upsert)
The system MUST expose `POST /api/values` accepting `{ cafe_id, criteria_id, nilai }` and inserting the row or updating it if the `(cafe_id, criteria_id)` pair already exists.

#### Scenario: New pair
- **WHEN** no row exists for the given `(cafe_id, criteria_id)`
- **THEN** the endpoint inserts a new row and returns `201`

#### Scenario: Existing pair
- **WHEN** a row already exists for the given pair
- **THEN** the endpoint updates `nilai` and returns `200`

#### Scenario: Negative or non-numeric nilai
- **WHEN** a request supplies `nilai: -1` or `nilai: "abc"`
- **THEN** the endpoint returns `422` with `errors.nilai`

### Requirement: Batch upsert values for one cafe
The system MUST expose `POST /api/values/batch` accepting `{ cafe_id, values: [{ criteria_id, nilai }, ...] }` and applying every upsert in a single transaction.

#### Scenario: All new pairs
- **WHEN** the request contains a `values` array whose pairs do not yet exist
- **THEN** the endpoint inserts them all and returns `200` with `{ inserted: N }`

#### Scenario: Mixed new and existing pairs
- **WHEN** some pairs already exist and some do not
- **THEN** the endpoint upserts all of them; the response shows `{ inserted, updated }`

#### Scenario: Foreign key violation
- **WHEN** the request references a `cafe_id` or `criteria_id` that does not exist
- **THEN** the endpoint returns `422` with the offending id and rolls back the entire transaction