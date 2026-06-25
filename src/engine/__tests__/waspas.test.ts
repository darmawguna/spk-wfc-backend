import { describe, it, expect } from "vitest";
import { calculate } from "../waspas.js";
import type { EngineInput } from "../types.js";

/** PRD seed data: 10 cafes × 6 criterias */
const PRD_CAFES = [
  { id: 1, kode: "A1" },
  { id: 2, kode: "A2" },
  { id: 3, kode: "A3" },
  { id: 4, kode: "A4" },
  { id: 5, kode: "A5" },
  { id: 6, kode: "A6" },
  { id: 7, kode: "A7" },
  { id: 8, kode: "A8" },
  { id: 9, kode: "A9" },
  { id: 10, kode: "A10" },
];

const PRD_CRITERIAS = [
  { id: 1, nama: "Kecepatan Internet", jenis: "benefit" as const, satuan: "Mbps", bobot: 0.30, urutan: 1 },
  { id: 2, nama: "Jumlah Stop Kontak", jenis: "benefit" as const, satuan: "unit", bobot: 0.20, urutan: 2 },
  { id: 3, nama: "Jarak dari Kampus", jenis: "cost" as const, satuan: "km", bobot: 0.15, urutan: 3 },
  { id: 4, nama: "Harga Menu Termurah", jenis: "cost" as const, satuan: "Rp", bobot: 0.15, urutan: 4 },
  { id: 5, nama: "Jam Operasional", jenis: "benefit" as const, satuan: "jam", bobot: 0.10, urutan: 5 },
  { id: 6, nama: "Fasilitas Umum", jenis: "benefit" as const, satuan: "poin", bobot: 0.10, urutan: 6 },
];

const PRD_VALUES: Record<number, Record<number, number>> = {
  1:  { 1: 104.21, 2: 13,  3: 0.55, 4: 12000, 5: 15, 6: 2 },
  2:  { 1: 20.23,  2: 1,   3: 0.75, 4: 6000,  5: 13.5, 6: 3 },
  3:  { 1: 32.34,  2: 13,  3: 0.40, 4: 13000, 5: 14, 6: 5 },
  4:  { 1: 52.23,  2: 15,  3: 0.45, 4: 12000, 5: 17, 6: 3 },
  5:  { 1: 12.67,  2: 1,   3: 2.50, 4: 5000,  5: 12, 6: 2 },
  6:  { 1: 68.82,  2: 10,  3: 0.30, 4: 10000, 5: 14, 6: 4 },
  7:  { 1: 18.19,  2: 5,   3: 0.55, 4: 15000, 5: 14, 6: 4 },
  8:  { 1: 13.99,  2: 10,  3: 1.80, 4: 5000,  5: 12, 6: 3 },
  9:  { 1: 30.38,  2: 26,  3: 0.85, 4: 19000, 5: 15, 6: 2 },
  10: { 1: 96.38,  2: 31,  3: 0.12, 4: 20000, 5: 15, 6: 2 },
};

const DEFAULT_INPUT: EngineInput = {
  lambda: 0.5,
  cafes: PRD_CAFES,
  criterias: PRD_CRITERIAS,
  values: PRD_VALUES,
};

const TOLERANCE = 0.0001;

describe("WASPAS Engine — PRD Reference Tests", () => {
  const output = calculate(DEFAULT_INPUT);

  it("TEST-01: should return 10 results", () => {
    expect(output.results).toHaveLength(10);
  });

  it("TEST-02: should rank A10 as #1 with Qi ≈ 0.7541", () => {
    const a10 = output.results.find((r) => r.kode === "A10");
    expect(a10).toBeDefined();
    expect(a10!.ranking).toBe(1);
    expect(a10!.qi).toBeCloseTo(0.7541, 4);
  });

  it("TEST-03: should rank A1 as #2", () => {
    const r = output.results.find((r) => r.kode === "A1");
    expect(r?.ranking).toBe(2);
  });

  it("TEST-04: should rank A6 as #3", () => {
    const r = output.results.find((r) => r.kode === "A6");
    expect(r?.ranking).toBe(3);
  });

  it("TEST-05: should rank A4 as #4", () => {
    const r = output.results.find((r) => r.kode === "A4");
    expect(r?.ranking).toBe(4);
  });

  it("TEST-06: should rank A3 as #5", () => {
    const r = output.results.find((r) => r.kode === "A3");
    expect(r?.ranking).toBe(5);
  });

  it("TEST-07: should rank A9 as #6", () => {
    const r = output.results.find((r) => r.kode === "A9");
    expect(r?.ranking).toBe(6);
  });

  it("TEST-08: should rank A8 as #7", () => {
    const r = output.results.find((r) => r.kode === "A8");
    expect(r?.ranking).toBe(7);
  });

  it("TEST-09: should rank A7 as #8", () => {
    const r = output.results.find((r) => r.kode === "A7");
    expect(r?.ranking).toBe(8);
  });

  it("TEST-10: should rank A2 as #9", () => {
    const r = output.results.find((r) => r.kode === "A2");
    expect(r?.ranking).toBe(9);
  });

  it("TEST-11: should rank A5 as #10", () => {
    const r = output.results.find((r) => r.kode === "A5");
    expect(r?.ranking).toBe(10);
  });

  it("TEST-12: all computed values are internally consistent (Qi = λ·WSM + (1-λ)·WPM)", () => {
    for (const result of output.results) {
      const expectedQi = 0.5 * result.wsm + 0.5 * result.wpm;
      expect(result.qi).toBeCloseTo(expectedQi, 8);
    }
  });

  it("TEST-13: A10 matches PRD spot check Qi ≈ 0.7541 ± 0.0001", () => {
    // Already tested in TEST-02; confirm WSM and WPM too
    const a10 = output.results.find((r) => r.kode === "A10");
    expect(a10).toBeDefined();
    expect(a10!.wsm).toBeCloseTo(0.7932, 4);
    expect(a10!.wpm).toBeCloseTo(0.7150, 4);
  });

  it("should produce keunggulan for #1 cafe", () => {
    expect(output.keunggulan.length).toBeGreaterThan(0);
    expect(output.keunggulan.length).toBeLessThanOrEqual(3);
    // A10's keunggulan should mention its best criteria
    const allText = output.keunggulan.join(" ");
    expect(allText).toContain("(");
  });
});

describe("Normalization Edge Cases", () => {
  it("should handle all-zero values for benefit criteria", () => {
    const allZero: Record<number, Record<number, number>> = {
      1: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      2: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    };
    const out = calculate({
      lambda: 0.5,
      cafes: [{ id: 1, kode: "C1" }, { id: 2, kode: "C2" }],
      criterias: [
        { id: 1, nama: "Internet", jenis: "benefit", satuan: "Mbps", bobot: 1.0, urutan: 1 },
      ],
      values: allZero,
    });
    expect(out.results).toHaveLength(2);
    expect(out.results[0]!.qi).toBe(0);
  });

  it("should handle single cafe input", () => {
    const out = calculate({
      lambda: 0.5,
      cafes: [{ id: 1, kode: "C1" }],
      criterias: [PRD_CRITERIAS[0]!],
      values: { 1: { 1: 100 } },
    });
    expect(out.results).toHaveLength(1);
    expect(out.results[0]!.ranking).toBe(1);
  });

  it("tiebreak by kode when Qi is identical", () => {
    const out = calculate({
      lambda: 0.5,
      cafes: [
        { id: 2, kode: "B" },
        { id: 1, kode: "A" },
      ],
      criterias: [
        { id: 1, nama: "Internet", jenis: "benefit", satuan: "Mbps", bobot: 1.0, urutan: 1 },
      ],
      values: { 1: { 1: 50 }, 2: { 1: 50 } },
    });
    expect(out.results[0]!.ranking).toBe(1);
    expect(out.results[0]!.kode).toBe("A"); // tiebreak: A before B
  });
});
