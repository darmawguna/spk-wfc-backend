import { describe, it, expect } from "vitest";
import { validateWeightSet } from "../../services/weightValidator.js";
import { AppError } from "../../middleware/error.js";

const existingCriteria = [{ id: 1 }, { id: 2 }, { id: 3 }];

describe("validateWeightSet", () => {
  it("should return ValidatedWeightSet for valid input", () => {
    const weights = [
      { criteriaId: 1, bobot: 0.4 },
      { criteriaId: 2, bobot: 0.3 },
      { criteriaId: 3, bobot: 0.3 },
    ];
    const result = validateWeightSet(weights, existingCriteria);
    expect(result.weights).toEqual(weights);
    expect(result.sum).toBeCloseTo(1.0, 3);
  });

  it("should accept sum within ±0.001 tolerance", () => {
    // 0.333 + 0.334 + 0.333 = 1.000 (within tolerance)
    const weights = [
      { criteriaId: 1, bobot: 0.333 },
      { criteriaId: 2, bobot: 0.334 },
      { criteriaId: 3, bobot: 0.333 },
    ];
    const result = validateWeightSet(weights, existingCriteria);
    expect(result.sum).toBeCloseTo(1.0, 3);
  });

  it("should throw 422 when count does not match", () => {
    const weights = [
      { criteriaId: 1, bobot: 0.5 },
      { criteriaId: 2, bobot: 0.5 },
    ];
    expect(() => validateWeightSet(weights, existingCriteria)).toThrow(AppError);
    try {
      validateWeightSet(weights, existingCriteria);
    } catch (e) {
      const err = e as AppError;
      expect(err.statusCode).toBe(422);
      expect(err.message).toBe("Jumlah bobot harus 3, diterima 2");
    }
  });

  it("should throw 422 when criteriaId does not exist", () => {
    const weights = [
      { criteriaId: 1, bobot: 0.4 },
      { criteriaId: 99, bobot: 0.3 },
      { criteriaId: 3, bobot: 0.3 },
    ];
    expect(() => validateWeightSet(weights, existingCriteria)).toThrow(AppError);
    try {
      validateWeightSet(weights, existingCriteria);
    } catch (e) {
      const err = e as AppError;
      expect(err.statusCode).toBe(422);
      expect(err.message).toBe("CriteriaId 99 tidak ditemukan");
    }
  });

  it("should throw 422 when criteriaId is duplicated", () => {
    const weights = [
      { criteriaId: 1, bobot: 0.4 },
      { criteriaId: 1, bobot: 0.3 },
      { criteriaId: 3, bobot: 0.3 },
    ];
    expect(() => validateWeightSet(weights, existingCriteria)).toThrow(AppError);
    try {
      validateWeightSet(weights, existingCriteria);
    } catch (e) {
      const err = e as AppError;
      expect(err.statusCode).toBe(422);
      expect(err.message).toBe("CriteriaId 1 duplikat");
    }
  });

  it("should throw 422 when bobot is out of range (> 1)", () => {
    const weights = [
      { criteriaId: 1, bobot: 1.5 },
      { criteriaId: 2, bobot: 0.3 },
      { criteriaId: 3, bobot: 0.3 },
    ];
    expect(() => validateWeightSet(weights, existingCriteria)).toThrow(AppError);
    try {
      validateWeightSet(weights, existingCriteria);
    } catch (e) {
      const err = e as AppError;
      expect(err.statusCode).toBe(422);
      expect(err.message).toBe("Bobot untuk criteriaId 1 harus antara 0 dan 1");
    }
  });

  it("should throw 422 when bobot is negative", () => {
    const weights = [
      { criteriaId: 1, bobot: -0.1 },
      { criteriaId: 2, bobot: 0.6 },
      { criteriaId: 3, bobot: 0.5 },
    ];
    expect(() => validateWeightSet(weights, existingCriteria)).toThrow(AppError);
    try {
      validateWeightSet(weights, existingCriteria);
    } catch (e) {
      const err = e as AppError;
      expect(err.statusCode).toBe(422);
      expect(err.message).toBe("Bobot untuk criteriaId 1 harus antara 0 dan 1");
    }
  });

  it("should throw 422 when bobot is NaN", () => {
    const weights = [
      { criteriaId: 1, bobot: NaN },
      { criteriaId: 2, bobot: 0.5 },
      { criteriaId: 3, bobot: 0.5 },
    ];
    expect(() => validateWeightSet(weights, existingCriteria)).toThrow(AppError);
    try {
      validateWeightSet(weights, existingCriteria);
    } catch (e) {
      const err = e as AppError;
      expect(err.statusCode).toBe(422);
      expect(err.message).toBe("Bobot untuk criteriaId 1 harus antara 0 dan 1");
    }
  });

  it("should throw 422 when bobot is Infinity", () => {
    const weights = [
      { criteriaId: 1, bobot: Infinity },
      { criteriaId: 2, bobot: 0.5 },
      { criteriaId: 3, bobot: 0.5 },
    ];
    expect(() => validateWeightSet(weights, existingCriteria)).toThrow(AppError);
    try {
      validateWeightSet(weights, existingCriteria);
    } catch (e) {
      const err = e as AppError;
      expect(err.statusCode).toBe(422);
      expect(err.message).toBe("Bobot untuk criteriaId 1 harus antara 0 dan 1");
    }
  });

  it("should throw 422 when sum deviates from 1.0 beyond tolerance", () => {
    const weights = [
      { criteriaId: 1, bobot: 0.5 },
      { criteriaId: 2, bobot: 0.3 },
      { criteriaId: 3, bobot: 0.1 },
    ];
    expect(() => validateWeightSet(weights, existingCriteria)).toThrow(AppError);
    try {
      validateWeightSet(weights, existingCriteria);
    } catch (e) {
      const err = e as AppError;
      expect(err.statusCode).toBe(422);
      expect(err.message).toMatch(/Total bobot harus = 1\.00 \(saat ini: 0\.9000\)/);
    }
  });

  it("should accept boundary bobot values (0 and 1)", () => {
    const weights = [
      { criteriaId: 1, bobot: 1 },
      { criteriaId: 2, bobot: 0 },
      { criteriaId: 3, bobot: 0 },
    ];
    const result = validateWeightSet(weights, existingCriteria);
    expect(result.weights).toEqual(weights);
    expect(result.sum).toBe(1);
  });
});
