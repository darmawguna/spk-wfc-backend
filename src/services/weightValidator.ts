import { AppError } from "../middleware/error.js";

export interface WeightEntry {
  criteriaId: number;
  bobot: number;
}

export interface ValidatedWeightSet {
  weights: WeightEntry[];
  sum: number; // Should be 1.0 ± 0.001
}

const TOLERANCE = 0.001;

/**
 * Validates a user-submitted weight set against the existing criteria.
 * Throws AppError(422) with a specific message on any validation failure.
 */
export function validateWeightSet(
  weights: WeightEntry[],
  existingCriteria: { id: number }[]
): ValidatedWeightSet {
  // 1. Check count matches existing criteria count
  if (weights.length !== existingCriteria.length) {
    throw new AppError(
      422,
      `Jumlah bobot harus ${existingCriteria.length}, diterima ${weights.length}`
    );
  }

  // Build a set of valid criteria IDs for fast lookup
  const validIds = new Set(existingCriteria.map((c) => c.id));

  // Track seen criteriaIds to detect duplicates
  const seen = new Set<number>();

  for (const entry of weights) {
    // 2. Check all criteriaIds exist in the system
    if (!validIds.has(entry.criteriaId)) {
      throw new AppError(422, `CriteriaId ${entry.criteriaId} tidak ditemukan`);
    }

    // 3. Check no duplicate criteriaIds
    if (seen.has(entry.criteriaId)) {
      throw new AppError(422, `CriteriaId ${entry.criteriaId} duplikat`);
    }
    seen.add(entry.criteriaId);

    // 4. Check each bobot is a finite number in [0, 1]
    if (!Number.isFinite(entry.bobot) || entry.bobot < 0 || entry.bobot > 1) {
      throw new AppError(
        422,
        `Bobot untuk criteriaId ${entry.criteriaId} harus antara 0 dan 1`
      );
    }
  }

  // 5. Check sum equals 1.0 ± 0.001
  const sum = weights.reduce((acc, w) => acc + w.bobot, 0);
  if (Math.abs(sum - 1) > TOLERANCE) {
    throw new AppError(
      422,
      `Total bobot harus = 1.00 (saat ini: ${sum.toFixed(4)})`
    );
  }

  return { weights, sum };
}
