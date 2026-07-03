# Implementation Plan: Dynamic User Weighting

## Overview

This plan implements dynamic, user-defined weighting for WASPAS calculations. The implementation follows this order: database schema → shared validation → service layer → routes → integration wiring. Property-based tests validate mathematical correctness properties using fast-check, while unit/integration tests cover API behavior.

## Tasks

- [x] 1. Database schema and shared validation utilities
  - [x] 1.1 Add WeightPreset and PresetWeight models to Prisma schema
    - Add `WeightPreset` model with `id`, `name` (unique), `description`, `createdAt`, `updatedAt`, and relation to `PresetWeight[]`
    - Add `PresetWeight` model with `id`, `presetId`, `criteriaId`, `bobot`, unique constraint on `[presetId, criteriaId]`, and cascade deletes
    - Add `presetWeights PresetWeight[]` reverse relation to the existing `Criteria` model
    - Run `prisma migrate dev` to generate migration
    - _Requirements: 4.1, 4.5_

  - [x] 1.2 Create weight validation utility (`src/services/weightValidator.ts`)
    - Implement `validateWeightSet(weights: WeightEntry[], existingCriteria: { id: number }[]): ValidatedWeightSet`
    - Check count matches existing criteria count (error: `"Jumlah bobot harus {expected}, diterima {actual}"`)
    - Check all criteriaIds exist in the system (error: `"CriteriaId {id} tidak ditemukan"`)
    - Check no duplicate criteriaIds (error: `"CriteriaId {id} duplikat"`)
    - Check each bobot is a finite number in [0, 1] (error: `"Bobot untuk criteriaId {id} harus antara 0 dan 1"`)
    - Check sum equals 1.0 ± 0.001 (error: `"Total bobot harus = 1.00 (saat ini: {sum})"`)
    - Throw `AppError(422)` on any failure with the specific message
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 1.3 Write property test for weight set structural validation
    - **Property 1: Weight Set Structural Validation**
    - Use fast-check to generate arbitrary weight arrays and verify that `validateWeightSet` rejects inputs if and only if constraints are violated
    - Test file: `src/__tests__/services/weightValidator.property.test.ts`
    - **Validates: Requirements 1.4, 1.5, 1.6, 6.1, 6.2, 6.3, 6.4**

  - [ ]* 1.4 Write property test for weight sum round-trip
    - **Property 5: Weight Sum Round-Trip**
    - Use fast-check to generate valid weight arrays, serialize to JSON, parse back, and verify sum is preserved within ±0.001
    - Test file: `src/__tests__/services/weightValidator.property.test.ts`
    - **Validates: Requirements 6.5**

- [x] 2. Preset repository and service
  - [x] 2.1 Create preset repository (`src/repositories/presetRepository.ts`)
    - Implement `findAll()` — returns all presets ordered by `createdAt` descending, including their weights
    - Implement `findById(id: number)` — returns preset with weights or null
    - Implement `findByName(name: string)` — case-insensitive lookup for uniqueness check
    - Implement `create(data)` — creates preset with nested weights
    - Implement `update(id, data)` — updates preset, replacing weights if provided
    - Implement `remove(id)` — deletes preset (cascade deletes weights)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 2.2 Create preset service (`src/services/presetService.ts`)
    - Implement `createPreset(input: CreatePresetInput)` — validates name uniqueness (case-insensitive), validates weight set using `validateWeightSet`, persists via repository
    - Implement `updatePreset(id: number, input: UpdatePresetInput)` — checks preset exists (404 if not), validates weight set if provided, validates name uniqueness if changed, updates via repository
    - Implement `deletePreset(id: number)` — checks preset exists (404 if not), removes via repository
    - Implement `listPresets()` — returns all presets from repository
    - Implement `getPresetById(id: number)` — returns preset or throws 404
    - Name validation: 1-100 chars, regex `/^[a-zA-Z0-9\s\-_]+$/`, case-insensitive uniqueness
    - Description validation: max 500 characters
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8_

  - [ ]* 2.3 Write property test for preset name validation
    - **Property 10: Preset Name Validation**
    - Use fast-check to generate arbitrary strings and verify the name validation logic accepts if and only if the string is 1-100 chars with only allowed characters
    - Test file: `src/__tests__/services/presetService.property.test.ts`
    - **Validates: Requirements 4.6**

- [x] 3. User calculation service
  - [x] 3.1 Create user calculation service (`src/services/userCalculateService.ts`)
    - Implement `runUserCalculation(req: UserCalcRequest): Promise<UserCalcResult>`
    - Resolve weight source: inline weights → validate with `validateWeightSet`; presetId → load preset, check criteria count matches (422 if outdated); neither → load Global_Bobot from Criteria table
    - Reject if both `weights` and `presetId` provided (422)
    - Handle lambda: default to 0.5 if not provided, round to 4 decimal places if > 4 decimals
    - Execute pre-flight checks: no cafes → 422, no criteria → 422, incomplete values → 422 with count, cost criteria zero value → 422 with criteria name, default bobot sum invalid (when using defaults) → 422
    - Build `EngineInput` with resolved weights overriding `criterias[].bobot`
    - Call `calculate(engineInput)` from WASPAS engine
    - Format response: round wsm/wpm/qi to 4 decimal places, include cafe kode and nama, build metadata with weightSource and calculatedAt (ISO 8601 UTC), include keunggulan (max 3), include lambda used
    - Do NOT write to any database table (stateless)
    - _Requirements: 1.1, 1.2, 1.3, 1.8, 2.1, 2.2, 2.4, 2.5, 3.1, 3.2, 3.5, 5.1, 5.2, 5.3, 5.4, 7.1, 7.2, 7.3, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 3.2 Write property test for stateless calculation invariant
    - **Property 2: Stateless Calculation Invariant**
    - Use fast-check with a seeded test database to verify that database state is unchanged after any user calculation request
    - Test file: `src/__tests__/services/userCalculateService.property.test.ts`
    - **Validates: Requirements 2.1, 2.2, 2.5**

  - [ ]* 3.3 Write property test for lambda correctness in Qi formula
    - **Property 3: Lambda Correctness in Qi Formula**
    - Use fast-check to generate lambda values in [0, 1] and verify Qi = λ × WSM + (1 - λ) × WPM within ±0.0001
    - Test file: `src/__tests__/engine/waspas.property.test.ts`
    - **Validates: Requirements 3.1**

  - [ ]* 3.4 Write property test for lambda input normalization
    - **Property 4: Lambda Input Normalization**
    - Use fast-check to generate lambda values with varying decimal places and verify rounding to 4 decimal places, and rejection for out-of-range values
    - Test file: `src/__tests__/engine/waspas.property.test.ts`
    - **Validates: Requirements 3.4, 3.5**

  - [ ]* 3.5 Write property test for calculation purity
    - **Property 6: Calculation Purity**
    - Use fast-check to generate valid EngineInput and verify that calling `calculate()` twice with the same input produces identical output
    - Test file: `src/__tests__/engine/waspas.property.test.ts`
    - **Validates: Requirements 7.4, 5.1**

- [x] 4. Checkpoint - Core services complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Route layer and Zod schemas
  - [x] 5.1 Create Zod schemas for user calculation and presets
    - Define `userCalcSchema` with optional `weights` array, optional `presetId`, optional `lambda`, and refinement that weights and presetId are mutually exclusive
    - Define `presetCreateSchema` with `name` (1-100 chars, regex validated), optional `description` (max 500), and `weights` array
    - Define `presetUpdateSchema` with all fields optional
    - Place schemas in `src/routes/schemas/` or colocate with route files
    - _Requirements: 1.3, 3.4, 4.6, 5.2_

  - [x] 5.2 Add `POST /api/waspas/user-calculate` route to `src/routes/waspas.ts`
    - No auth middleware (public endpoint)
    - Use `validate(userCalcSchema)` middleware
    - Call `runUserCalculation(req.body)` and return `{ success: true, data: result }`
    - Handle errors via existing `next(e)` pattern
    - _Requirements: 1.1, 1.9, 9.1_

  - [x] 5.3 Create preset routes (`src/routes/presets.ts`)
    - `GET /` — public, returns `{ success: true, data: presets }` (max 50, ordered by createdAt desc)
    - `POST /` — requireAdmin, validate(presetCreateSchema), calls presetService.createPreset, returns 201
    - `PUT /:id` — requireAdmin, validate(presetUpdateSchema), calls presetService.updatePreset
    - `DELETE /:id` — requireAdmin, calls presetService.deletePreset
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.7, 4.8, 4.9, 9.3, 9.4_

  - [x] 5.4 Register preset router in `src/app.ts`
    - Import presets router and mount at `/api/presets`
    - _Requirements: 9.3, 9.4_

- [ ] 6. Integration tests and remaining property tests
  - [ ]* 6.1 Write integration tests for user calculation endpoint
    - Test happy path with inline weights → verify 200 response shape
    - Test happy path with preset reference → verify weightSource "preset"
    - Test fallback to default weights → verify weightSource "default"
    - Test 422 for invalid weights (bad sum, missing criteria, duplicates)
    - Test 422 for both weights and presetId submitted
    - Test 422 for pre-flight failures (no cafes, no criteria, incomplete values, cost zero)
    - Test 404 for non-existent preset
    - Test 422 for outdated preset
    - Test lambda default (0.5) and custom lambda
    - Test lambda rounding (> 4 decimal places)
    - Test file: `src/__tests__/userCalculate.routes.test.ts`
    - _Requirements: 1.1, 1.2, 1.7, 1.8, 2.1, 3.2, 3.4, 5.2, 5.4, 7.1, 7.2, 7.3, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 6.2 Write integration tests for preset CRUD endpoints
    - Test admin can create preset (201)
    - Test admin can update preset
    - Test admin can delete preset (200)
    - Test public user can list presets
    - Test 401 for unauthenticated POST/PUT/DELETE
    - Test 404 for update/delete non-existent preset
    - Test 422 for invalid preset name (too long, invalid chars)
    - Test 422 for duplicate name (case-insensitive)
    - Test 422 for invalid weight set in preset
    - Test file: `src/__tests__/presets.routes.test.ts`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.8, 4.9, 9.3, 9.4, 9.5_

  - [ ]* 6.3 Write property test for response shape invariant
    - **Property 7: Response Shape Invariant**
    - Use fast-check to generate valid calculation inputs and verify the response always contains properly structured results array (sorted by ranking), weights array, lambda in [0,1], and keunggulan array (max 3)
    - Test file: `src/__tests__/services/userCalculateService.property.test.ts`
    - **Validates: Requirements 7.1, 7.2**

  - [ ]* 6.4 Write property test for metadata weight source correctness
    - **Property 8: Metadata Weight Source Correctness**
    - Use fast-check to generate different request shapes (with weights, with presetId, with neither) and verify metadata.weightSource matches the expected literal
    - Test file: `src/__tests__/services/userCalculateService.property.test.ts`
    - **Validates: Requirements 7.3**

  - [ ]* 6.5 Write property test for preset listing order
    - **Property 9: Preset Listing Order**
    - Create multiple presets with different timestamps and verify the listing endpoint always returns them ordered by createdAt descending
    - Test file: `src/__tests__/presets.routes.test.ts`
    - **Validates: Requirements 4.2**

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The WASPAS engine (`src/engine/waspas.ts`) is not modified — weights are overridden at the service layer via `EngineInput.criterias[].bobot`
- fast-check is not yet in dependencies — install it as a dev dependency (`npm install -D fast-check`) as part of the first property test task
- All error messages use Indonesian following the existing project convention

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "2.1"] },
    { "id": 2, "tasks": ["2.2", "5.1"] },
    { "id": 3, "tasks": ["2.3", "3.1"] },
    { "id": 4, "tasks": ["3.2", "3.3", "3.4", "3.5", "5.2", "5.3"] },
    { "id": 5, "tasks": ["5.4"] },
    { "id": 6, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5"] }
  ]
}
```
