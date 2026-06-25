import prisma from "../lib/prisma.js";
import { calculate } from "../engine/waspas.js";
import * as waspasRepo from "../repositories/waspasRepository.js";
import { AppError } from "../middleware/error.js";

const TOLERANCE = 0.001;

async function preFlightCheck() {
  const [cafes, criterias] = await Promise.all([
    prisma.cafe.findMany({ orderBy: { kode: "asc" } }),
    prisma.criteria.findMany({ orderBy: { urutan: "asc" } }),
  ]);

  if (cafes.length === 0) {
    throw new AppError(422, "Belum ada data cafe");
  }
  if (criterias.length === 0) {
    throw new AppError(422, "Belum ada data kriteria");
  }

  // Bobot sum check
  const totalBobot = criterias.reduce((s, c) => s + c.bobot, 0);
  if (Math.abs(totalBobot - 1) > TOLERANCE) {
    throw new AppError(422, `Total bobot harus = 1.00 (saat ini: ${totalBobot.toFixed(4)})`);
  }

  // Coverage check
  const valueCount = await prisma.alternativeValue.count();
  const expected = cafes.length * criterias.length;
  if (valueCount < expected) {
    throw new AppError(
      422,
      `Data nilai tidak lengkap: ${valueCount}/${expected} terisi. Lengkapi semua nilai alternatif terlebih dahulu.`
    );
  }

  // Non-zero cost check for division safety
  const costCriterias = criterias.filter((c) => c.jenis === "cost");
  for (const cc of costCriterias) {
    const zeroCostCount = await prisma.alternativeValue.count({
      where: { criteriaId: cc.id, nilai: 0 },
    });
    if (zeroCostCount > 0) {
      throw new AppError(422, `Kriteria "${cc.nama}" (cost) memiliki nilai 0, tidak bisa dinormalisasi`);
    }
  }

  return { cafes, criterias };
}

export async function runCalculation() {
  const { cafes, criterias } = await preFlightCheck();

  // Build value matrix
  const allValues = await prisma.alternativeValue.findMany();
  const values: Record<number, Record<number, number>> = {};
  for (const v of allValues) {
    if (!values[v.cafeId]) values[v.cafeId] = {};
    values[v.cafeId]![v.criteriaId] = v.nilai;
  }

  // Defensive: ensure all cafes in the value matrix
  for (const cafe of cafes) {
    if (!values[cafe.id]) {
      throw new AppError(422, `Cafe ${cafe.kode} tidak memiliki data nilai`);
    }
  }

  const input = {
    lambda: 0.5,
    cafes: cafes.map((c) => ({ id: c.id, kode: c.kode })),
    criterias: criterias.map((c) => ({
      id: c.id,
      nama: c.nama,
      jenis: c.jenis as "benefit" | "cost",
      satuan: c.satuan,
      bobot: c.bobot,
      urutan: c.urutan,
    })),
    values,
  };

  const output = calculate(input);

  // Persist
  await waspasRepo.upsertMany(
    output.results.map((r) => ({
      cafeId: r.cafeId,
      ranking: r.ranking,
      wsm: parseFloat(r.wsm.toFixed(4)),
      wpm: parseFloat(r.wpm.toFixed(4)),
      qi: parseFloat(r.qi.toFixed(4)),
    }))
  );

  // Re-fetch from DB to ensure consistent shape with GET /waspas/results
  // (calculate engine returns flat `kode`, but persisted rows include nested `cafe` object)
  const persisted = await waspasRepo.findAll();

  return {
    results: persisted,
    keunggulan: output.keunggulan,
  };
}
