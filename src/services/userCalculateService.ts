import prisma from "../lib/prisma.js";
import { calculate } from "../engine/waspas.js";
import { validateWeightSet, WeightEntry } from "./weightValidator.js";
import { getPresetById } from "./presetService.js";
import { AppError } from "../middleware/error.js";

export interface UserCalcRequest {
  weights?: WeightEntry[];
  presetId?: number;
  lambda?: number;
}

export interface UserResultEntry {
  ranking: number;
  cafeId: number;
  cafe: { kode: string; nama: string };
  wsm: number;
  wpm: number;
  qi: number;
}

export interface UserCalcResult {
  results: UserResultEntry[];
  weights: WeightEntry[];
  lambda: number;
  keunggulan: string[];
  metadata: {
    weightSource: "inline" | "preset" | "default";
    presetName?: string;
    calculatedAt: string; // ISO 8601
  };
}

const TOLERANCE = 0.001;

/**
 * Resolves the lambda value: defaults to 0.5, rounds to 4 decimal places.
 */
function resolveLambda(lambda?: number): number {
  if (lambda === undefined || lambda === null) {
    return 0.5;
  }
  return parseFloat(lambda.toFixed(4));
}

/**
 * Resolves the weight source and returns the weights along with metadata.
 */
async function resolveWeights(
  req: UserCalcRequest,
  existingCriteria: { id: number }[]
): Promise<{
  weights: WeightEntry[];
  weightSource: "inline" | "preset" | "default";
  presetName?: string;
}> {
  // Reject if both weights and presetId provided
  if (req.weights && req.presetId) {
    throw new AppError(
      422,
      "Hanya boleh memilih satu sumber bobot: weights atau presetId"
    );
  }

  // Case 1: Inline weights
  if (req.weights) {
    validateWeightSet(req.weights, existingCriteria);
    return { weights: req.weights, weightSource: "inline" };
  }

  // Case 2: Preset reference
  if (req.presetId) {
    const preset = await getPresetById(req.presetId);

    // Check criteria count matches (preset may be outdated)
    if (preset.weights.length !== existingCriteria.length) {
      throw new AppError(
        422,
        `Preset '${preset.name}' sudah tidak valid: jumlah kriteria berubah`
      );
    }

    const weights: WeightEntry[] = preset.weights.map((w) => ({
      criteriaId: w.criteriaId,
      bobot: w.bobot,
    }));

    return { weights, weightSource: "preset", presetName: preset.name };
  }

  // Case 3: Default (Global_Bobot from Criteria table)
  const criterias = await prisma.criteria.findMany({
    select: { id: true, bobot: true },
    orderBy: { urutan: "asc" },
  });

  // Validate default bobot sum
  const totalBobot = criterias.reduce((s, c) => s + c.bobot, 0);
  if (Math.abs(totalBobot - 1) > TOLERANCE) {
    throw new AppError(
      422,
      `Total bobot default harus = 1.00 (saat ini: ${totalBobot.toFixed(4)})`
    );
  }

  const weights: WeightEntry[] = criterias.map((c) => ({
    criteriaId: c.id,
    bobot: c.bobot,
  }));

  return { weights, weightSource: "default" };
}

/**
 * Executes pre-flight checks similar to calculateService but with user-facing messages.
 */
async function preFlightCheck() {
  const [cafes, criterias] = await Promise.all([
    prisma.cafe.findMany({ orderBy: { kode: "asc" }, select: { id: true, kode: true, nama: true } }),
    prisma.criteria.findMany({ orderBy: { urutan: "asc" } }),
  ]);

  if (cafes.length === 0) {
    throw new AppError(422, "Belum ada data cafe");
  }
  if (criterias.length === 0) {
    throw new AppError(422, "Belum ada data kriteria");
  }

  // Coverage check
  const valueCount = await prisma.alternativeValue.count();
  const expected = cafes.length * criterias.length;
  if (valueCount < expected) {
    throw new AppError(
      422,
      `Data nilai tidak lengkap: ${valueCount}/${expected} terisi`
    );
  }

  // Non-zero cost check for division safety
  const costCriterias = criterias.filter((c) => c.jenis === "cost");
  for (const cc of costCriterias) {
    const zeroCostCount = await prisma.alternativeValue.count({
      where: { criteriaId: cc.id, nilai: 0 },
    });
    if (zeroCostCount > 0) {
      throw new AppError(
        422,
        `Kriteria "${cc.nama}" (cost) memiliki nilai 0`
      );
    }
  }

  return { cafes, criterias };
}

/**
 * Runs a stateless user-facing WASPAS calculation.
 * Does NOT write to any database table.
 */
export async function runUserCalculation(
  req: UserCalcRequest
): Promise<UserCalcResult> {
  // 1. Pre-flight checks
  const { cafes, criterias } = await preFlightCheck();

  // 2. Resolve weights
  const existingCriteria = criterias.map((c) => ({ id: c.id }));
  const { weights, weightSource, presetName } = await resolveWeights(
    req,
    existingCriteria
  );

  // 3. Resolve lambda
  const lambda = resolveLambda(req.lambda);

  // 4. Build value matrix
  const allValues = await prisma.alternativeValue.findMany();
  const values: Record<number, Record<number, number>> = {};
  for (const v of allValues) {
    if (!values[v.cafeId]) values[v.cafeId] = {};
    values[v.cafeId]![v.criteriaId] = v.nilai;
  }

  // 5. Build EngineInput with resolved weights overriding criterias[].bobot
  const weightMap = new Map(weights.map((w) => [w.criteriaId, w.bobot]));

  const engineInput = {
    lambda,
    cafes: cafes.map((c) => ({ id: c.id, kode: c.kode })),
    criterias: criterias.map((c) => ({
      id: c.id,
      nama: c.nama,
      jenis: c.jenis as "benefit" | "cost",
      satuan: c.satuan,
      bobot: weightMap.get(c.id) ?? c.bobot,
      urutan: c.urutan,
    })),
    values,
  };

  // 6. Execute WASPAS calculation
  const output = calculate(engineInput);

  // 7. Build cafe lookup for response
  const cafeMap = new Map(cafes.map((c) => [c.id, { kode: c.kode, nama: c.nama }]));

  // 8. Format response
  const results: UserResultEntry[] = output.results.map((r) => ({
    ranking: r.ranking,
    cafeId: r.cafeId,
    cafe: cafeMap.get(r.cafeId) ?? { kode: r.kode, nama: "" },
    wsm: parseFloat(r.wsm.toFixed(4)),
    wpm: parseFloat(r.wpm.toFixed(4)),
    qi: parseFloat(r.qi.toFixed(4)),
  }));

  // 9. Build metadata
  const metadata: UserCalcResult["metadata"] = {
    weightSource,
    calculatedAt: new Date().toISOString(),
  };
  if (presetName) {
    metadata.presetName = presetName;
  }

  return {
    results,
    weights,
    lambda,
    keunggulan: output.keunggulan.slice(0, 3),
    metadata,
  };
}
