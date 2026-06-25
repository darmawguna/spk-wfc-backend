import type { EngineInput, AlternativeResult, NormalizedRow, EngineOutput } from "./types.js";

/**
 * Pure WASPAS calculation engine.
 * No I/O — testable without a database.
 *
 * Steps:
 * 1. Build decision matrix from input
 * 2. Normalize: benefit = x/max, cost = min/x
 * 3. Compute WSM (Weighted Sum Model)
 * 4. Compute WPM (Weighted Product Model)
 * 5. Compute Qi = λ × WSM + (1 - λ) × WPM
 * 6. Rank by Qi desc (tiebreak by kode asc)
 */
export function calculate(input: EngineInput): EngineOutput {
  const { lambda, cafes, criterias, values } = input;
  const cafeIds = Object.keys(values).map(Number);

  // --- Normalize ---
  const normalized: NormalizedRow[] = [];

  for (const criteria of criterias) {
    const rawValues = cafeIds.map((cid) => values[cid]?.[criteria.id] ?? 0);
    const max = Math.max(...rawValues);
    const min = Math.min(...rawValues);

    for (const cid of cafeIds) {
      const raw = values[cid]?.[criteria.id] ?? 0;
      const nv =
        criteria.jenis === "benefit"
          ? max !== 0
            ? raw / max
            : 0
          : raw !== 0
            ? min / raw
            : 0;

      let row = normalized.find((r) => r.cafeId === cid);
      if (!row) {
        const cafe = cafes.find((c) => c.id === cid);
        row = { cafeId: cid, kode: cafe?.kode ?? `C${cid}`, normalized: {} };
        normalized.push(row);
      }
      row.normalized[criteria.id] = nv;
    }
  }

  // --- WSM & WPM ---
  const rawResults: Omit<AlternativeResult, "ranking">[] = [];

  for (const row of normalized) {
    let wsm = 0;
    let wpm = 1;

    for (const criteria of criterias) {
      const nv = row.normalized[criteria.id] ?? 0;
      const w = criteria.bobot;
      wsm += nv * w;
      wpm *= Math.pow(nv, w);
    }

    rawResults.push({
      cafeId: row.cafeId,
      kode: row.kode,
      wsm,
      wpm,
      qi: lambda * wsm + (1 - lambda) * wpm,
    });
  }

  // --- Rank ---
  rawResults.sort((a, b) => {
    const qiDiff = b.qi - a.qi;
    if (Math.abs(qiDiff) > 0.0001) return qiDiff;
    return a.kode.localeCompare(b.kode); // tiebreak
  });

  const results = rawResults.map((r, i) => ({
    ...r,
    ranking: i + 1,
  }));

  // --- Keunggulan ---
  const keunggulan = pickKeunggulan(normalized, values, criterias, 3);

  return { results, normalized, keunggulan };
}

/**
 * Pick top-3 keunggulan for the #1 ranked cafe.
 */
export function pickKeunggulan(
  normalized: NormalizedRow[],
  rawValues: Record<number, Record<number, number>>,
  criterias: EngineInput["criterias"],
  limit = 3
): string[] {
  if (normalized.length === 0) return [];

  // #1 = highest sum of normalized scores
  const scored = normalized.map((r) => {
    const sum = Object.values(r.normalized).reduce((a, b) => a + b, 0);
    return { ...r, sum };
  });
  scored.sort((a, b) => b.sum - a.sum);
  const top = scored[0];
  if (!top) return [];

  const topRaw = rawValues[top.cafeId];
  if (!topRaw) return [];

  // Score each criteria: benefit = normalized (higher better), cost = 1 - normalized (lower raw better)
  const scoredCriteria = criterias
    .map((c) => {
      const nv = top.normalized[c.id] ?? 0;
      const raw = topRaw[c.id] ?? 0;
      const score = c.jenis === "benefit" ? nv : 1 - nv; // higher = more competitive
      return { ...c, raw, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scoredCriteria.map((c) => {
    const formattedRaw =
      c.nama === "Harga Menu Termurah"
        ? `Rp${c.raw.toLocaleString("id")}`
        : `${c.raw}${c.satuan ? " " + c.satuan : ""}`;
    return `${c.nama} (${formattedRaw})`;
  });
}
