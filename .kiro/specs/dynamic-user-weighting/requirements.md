# Requirements Document

## Introduction

This feature extends the SPK (Decision Support System) backend to support dynamic, user-defined weighting of criteria in WASPAS calculations. Currently, criteria weights (`bobot`) are globally set by an admin and shared across all calculations. This feature allows end-users (non-admin visitors) to submit their own weight preferences when requesting a WASPAS calculation, producing personalized rankings without modifying the global admin-configured weights. The admin-set weights remain the system default, while users can override them per-request for exploratory decision making.

## Glossary

- **WASPAS_Engine**: The pure calculation function that executes the Weighted Aggregated Sum Product Assessment algorithm, producing rankings from criteria, alternatives, and weights.
- **Criteria**: A decision factor (e.g., Internet speed, price, distance) with a type (benefit or cost), unit, and weight.
- **Bobot**: The numeric weight assigned to a criteria, representing its relative importance. Each bobot is a value between 0 and 1, and all bobot values must sum to 1.0.
- **Global_Bobot**: The admin-configured default weight for each criteria, stored in the Criteria table.
- **User_Weight_Set**: A complete set of user-supplied weights for all active criteria, submitted as part of a personalized calculation request.
- **Weight_Preset**: A named, reusable collection of criteria weights saved by an admin for common use-case scenarios.
- **Lambda**: The WASPAS aggregation parameter controlling the balance between WSM and WPM (default 0.5).
- **Calculation_Session**: A single execution of the WASPAS engine using a specific set of weights, producing a result set that is optionally persisted.
- **API_Gateway**: The Express.js HTTP layer that accepts requests and delegates to services.

## Requirements

### Requirement 1: User-Submitted Weight Calculation

**User Story:** As a user, I want to submit my own criteria weights when requesting a WASPAS calculation, so that I can get personalized cafe rankings based on my priorities.

#### Acceptance Criteria

1. WHEN a user submits a POST request to the user calculation endpoint with a valid User_Weight_Set, THE API_Gateway SHALL execute the WASPAS_Engine using the submitted weights with a lambda value of 0.5 and return the ranked results as an array sorted by ranking ascending, where each entry contains cafeId, cafe (kode, nama), wsm, wpm, qi, and ranking.
2. WHEN a user submits a POST request to the user calculation endpoint without a User_Weight_Set, THE API_Gateway SHALL execute the WASPAS_Engine using the Global_Bobot values from the Criteria table with a lambda value of 0.5 and return the ranked results in the same response shape as criterion 1.
3. THE API_Gateway SHALL accept a User_Weight_Set as an array of objects containing criteria identifier (criteriaId: number) and bobot value (bobot: number) pairs, with a maximum array size equal to the number of criteria in the system.
4. WHEN a user submits a User_Weight_Set, THE API_Gateway SHALL validate that the set contains exactly one weight entry for each criteria that exists in the Criteria table.
5. WHEN a user submits a User_Weight_Set, THE API_Gateway SHALL validate that each bobot value is a number between 0 and 1 inclusive.
6. WHEN a user submits a User_Weight_Set, THE API_Gateway SHALL validate that the sum of all bobot values equals 1.0 within a tolerance of ±0.001.
7. IF a user submits a User_Weight_Set that fails validation, THEN THE API_Gateway SHALL return a 422 response with an error message indicating the specific violation (missing criteria, out-of-range bobot, or incorrect sum).
8. IF the system has insufficient data to perform calculation (no cafes exist, no criteria exist, or alternative values are incomplete), THEN THE API_Gateway SHALL return a 422 response with an error message indicating which data prerequisite is not met.
9. THE API_Gateway SHALL expose the user calculation endpoint as a public route that does not require admin authentication.

### Requirement 2: User Calculation Does Not Persist Results

**User Story:** As a system administrator, I want user-initiated calculations to remain stateless, so that the persisted global ranking is only updated through admin-triggered calculations.

#### Acceptance Criteria

1. WHEN a user submits a calculation request with custom weights, THE API_Gateway SHALL execute the WASPAS calculation using the submitted weights in place of the stored bobot values, and return a response containing the ranked results (cafeId, ranking, wsm, wpm, qi for each alternative) without writing to the WaspasResult table or any other database table.
2. WHEN a user submits a calculation request with custom weights, THE API_Gateway SHALL not modify the bobot values stored in the Criteria table.
3. THE API_Gateway SHALL continue to support the existing admin-only POST /api/waspas/calculate endpoint that persists results using the stored Criteria bobot values.
4. IF a user submits a calculation request where the custom weights do not sum to 1.0 (within a tolerance of 0.001) or do not provide exactly one weight per existing criteria, THEN THE API_Gateway SHALL reject the request with a validation error indicating the constraint violation, without executing the calculation.
5. IF a user submits a calculation request and the pre-flight data checks fail (no cafes exist, alternative values are incomplete, or a cost criteria has a zero value), THEN THE API_Gateway SHALL reject the request with an error indicating the specific data issue, without modifying any database state.

### Requirement 3: User-Configurable Lambda Parameter

**User Story:** As a user, I want to optionally adjust the lambda parameter for my calculation, so that I can control the balance between WSM and WPM scoring models.

#### Acceptance Criteria

1. WHEN a user submits a calculation request with a lambda value, THE WASPAS_Engine SHALL use the submitted lambda value for the Qi aggregation formula.
2. WHEN a user submits a calculation request without a lambda value, THE WASPAS_Engine SHALL use 0.5 as the default lambda value.
3. WHEN a calculation completes successfully, THE API_Gateway SHALL include the lambda value used in the response payload so the user can confirm which weighting was applied.
4. IF a user submits a lambda value that is not a valid number or falls outside the range 0 to 1 inclusive, THEN THE API_Gateway SHALL return a 422 response with an error message indicating that lambda must be a number between 0 and 1 inclusive.
5. IF a user submits a lambda value with more than 4 decimal places, THEN THE API_Gateway SHALL round the value to 4 decimal places before passing it to the WASPAS_Engine.

### Requirement 4: Admin-Managed Weight Presets

**User Story:** As an administrator, I want to create and manage named weight presets, so that users can quickly apply common weighting scenarios without manually entering all weights.

#### Acceptance Criteria

1. WHEN an authenticated admin submits a POST request with a preset name, an optional description (maximum 500 characters), and a User_Weight_Set containing one weight entry per existing criteria, THE API_Gateway SHALL persist the Weight_Preset and return the created resource with its generated identifier and a 201 status code within 2 seconds.
2. WHEN any user requests the list of available presets, THE API_Gateway SHALL return all Weight_Preset records (maximum 50 presets) ordered by creation date descending within 2 seconds.
3. WHEN an authenticated admin submits a PUT request to update an existing Weight_Preset, THE API_Gateway SHALL validate that all weights in the new User_Weight_Set sum to 1.0 within a tolerance of ±0.001 and that each weight entry references an existing criteria, then update the stored preset and return the updated resource.
4. WHEN an authenticated admin submits a DELETE request for an existing Weight_Preset, THE API_Gateway SHALL remove the preset from storage and return a confirmation response with a 200 status code.
5. THE API_Gateway SHALL validate that each Weight_Preset contains exactly one weight entry per existing criteria, with individual weight values between 0.0 and 1.0 inclusive, and that all weights sum to 1.0 within a tolerance of ±0.001.
6. THE API_Gateway SHALL validate that each Weight_Preset name is unique (case-insensitive), between 1 and 100 characters, and contains only alphanumeric characters, spaces, hyphens, and underscores.
7. IF a user submits a calculation request referencing a non-existent preset identifier, THEN THE API_Gateway SHALL return a 404 response with an error message indicating the preset was not found.
8. IF an authenticated admin submits a PUT or DELETE request referencing a non-existent Weight_Preset identifier, THEN THE API_Gateway SHALL return a 404 response with an error message indicating the preset was not found, without modifying any stored data.
9. IF a non-authenticated or non-admin user submits a POST, PUT, or DELETE request to the Weight_Preset endpoints, THEN THE API_Gateway SHALL return a 401 response with an error message indicating authentication is required, without modifying any stored data.

### Requirement 5: Calculation Request with Preset Reference

**User Story:** As a user, I want to select a weight preset by name when requesting a calculation, so that I can quickly get results for common scenarios without specifying individual weights.

#### Acceptance Criteria

1. WHEN a user submits a calculation request with a preset identifier, THE API_Gateway SHALL retrieve the corresponding Weight_Preset and use its weights for the WASPAS_Engine calculation.
2. IF a user submits a calculation request with both a preset identifier and an inline User_Weight_Set, THEN THE API_Gateway SHALL return a 422 response with an error message indicating that only one weight source is allowed per request.
3. WHEN a user submits a calculation request with a preset identifier and the calculation succeeds, THE API_Gateway SHALL return a metadata object containing the weight_source value "preset" and the preset name used.
4. IF a user submits a calculation request referencing a Weight_Preset whose stored weight count does not match the current number of active criteria, THEN THE API_Gateway SHALL return a 422 response with an error message indicating the preset is outdated and must be updated by an admin.

### Requirement 6: Weight Validation Invariants

**User Story:** As a developer, I want all weight inputs validated consistently, so that the WASPAS engine always receives mathematically valid inputs.

#### Acceptance Criteria

1. THE API_Gateway SHALL reject any weight set where the number of weight entries does not match the current number of criteria in the Criteria table, returning a 422 response indicating the expected and actual count.
2. THE API_Gateway SHALL reject any weight set containing a criteria identifier that does not exist in the Criteria table, returning a 422 response identifying the invalid criteria identifier.
3. THE API_Gateway SHALL reject any weight set containing duplicate criteria identifiers, returning a 422 response identifying the duplicated identifier.
4. THE API_Gateway SHALL reject any weight set where any individual bobot value is not a finite number between 0 and 1 inclusive, returning a 422 response identifying the invalid entry.
5. FOR ALL valid User_Weight_Set inputs, parsing the weight array and reconstructing the sum SHALL produce the original sum value within floating-point tolerance of ±0.001 (round-trip property).

### Requirement 7: Response Shape for User Calculations

**User Story:** As a frontend developer, I want the user calculation response to have a consistent and informative shape, so that I can render personalized results alongside metadata about the weights used.

#### Acceptance Criteria

1. WHEN a user calculation succeeds, THE API_Gateway SHALL return an HTTP 200 response containing: a `results` array sorted by ranking ascending, a `weights` array listing each weight entry as `{ criteriaId, bobot }` matching the weights applied during calculation, the `lambda` numeric value used (between 0.0 and 1.0 inclusive), and a `keunggulan` array of at most 3 recommendation strings each following the format `"<criteria nama> (<formatted value> <satuan>)"`.
2. THE API_Gateway SHALL return each entry in the `results` array with the fields: `ranking` (integer starting at 1), `cafeId` (integer), `cafe` object containing `kode` (string) and `nama` (string), `wsm` (number rounded to 4 decimal places), `wpm` (number rounded to 4 decimal places), and `qi` (number rounded to 4 decimal places).
3. WHEN a user calculation succeeds, THE API_Gateway SHALL return a `metadata` object containing `weightSource` set to one of the literal string values `"inline"`, `"preset"`, or `"default"` indicating the origin of the weights, and `calculatedAt` as an ISO 8601 UTC timestamp string representing when the calculation was performed.
4. THE WASPAS_Engine SHALL produce identical results when called with the same inputs regardless of whether the weights originated from Global_Bobot, a User_Weight_Set, or a Weight_Preset (calculation purity property).
5. IF the user calculation request succeeds but the `results` array is empty because no cafes exist in the dataset, THEN THE API_Gateway SHALL return an HTTP 200 response with `results` as an empty array, `keunggulan` as an empty array, and the `metadata` object still populated with `weightSource` and `calculatedAt`.

### Requirement 8: Pre-flight Validation for User Calculations

**User Story:** As a user, I want clear error messages when the system cannot perform a calculation, so that I understand what data is missing.

#### Acceptance Criteria

1. IF no cafes exist in the system, THEN THE API_Gateway SHALL return a 422 response with a message indicating that no alternative data is available for calculation.
2. IF no criteria exist in the system, THEN THE API_Gateway SHALL return a 422 response with a message indicating that no criteria data is available for calculation.
3. IF the alternative values matrix is incomplete (fewer than cafes × criteria entries exist in the NilaiAlternatif table), THEN THE API_Gateway SHALL return a 422 response that includes the current count and expected count of values (e.g., "X/Y terisi").
4. IF any cost-type criteria has an alternative value of zero, THEN THE API_Gateway SHALL return a 422 response that includes the name of the criteria causing the division-by-zero risk.
5. IF the sum of all criteria bobot values deviates from 1.0 by more than 0.001, THEN THE API_Gateway SHALL return a 422 response indicating the current total bobot value.
6. THE API_Gateway SHALL execute all pre-flight validations in criteria 1–5 before performing any WASPAS calculation, and SHALL return the first failing validation as the 422 response.

### Requirement 9: Access Control for User Calculation Endpoint

**User Story:** As a system operator, I want the user calculation endpoint to be publicly accessible without authentication, so that any visitor can explore personalized rankings.

#### Acceptance Criteria

1. THE API_Gateway SHALL expose the user calculation endpoint (POST /api/waspas/user-calculate) without requiring authentication or an Authorization header.
2. THE API_Gateway SHALL continue to require a valid JWT Bearer token via the requireAdmin middleware for the existing POST /api/waspas/calculate endpoint that persists results.
3. THE API_Gateway SHALL require a valid JWT Bearer token via the requireAdmin middleware for POST, PUT, and DELETE operations on Weight_Preset records.
4. THE API_Gateway SHALL expose the GET endpoint for listing Weight_Preset records without requiring authentication or an Authorization header.
5. IF a request to an admin-protected endpoint is missing a valid JWT Bearer token, THEN THE API_Gateway SHALL return a 401 response indicating that authentication is required, without executing the requested operation.
