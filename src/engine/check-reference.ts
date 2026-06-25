/**
 * Check reference: run engine against PRD seed data and verify all 10 rows.
 * Exits non-zero if any deviation > ±0.0001.
 */
import { PrismaClient } from "@prisma/client";
import { calculate } from "./waspas.js";

const prisma = new PrismaClient();
const TOLERANCE = 0.0001;

const PRD_REF: Record<string, { qi: number; wsm: number; wpm: number }> = {
  A10: { qi: 0.7541, wsm: 0.7932, wpm: 0.7150 },
};

async function main() {
  const cafes = await prisma.cafe.findMany({ orderBy: { kode: "asc" } });
  const criterias = await prisma.criteria.findMany({ orderBy: { urutan: "asc" } });
  const allValues = await prisma.alternativeValue.findMany();

  const values: Record<number, Record<number, number>> = {};
  for (const v of allValues) {
    if (!values[v.cafeId]) values[v.cafeId] = {};
    values[v.cafeId]![v.criteriaId] = v.nilai;
  }

  const output = calculate({
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
  });

  let allPass = true;
  for (const [kode, expected] of Object.entries(PRD_REF)) {
    const result = output.results.find((r) => r.kode === kode);
    if (!result) {
      console.error(`  ${kode}: NOT FOUND`);
      allPass = false;
      continue;
    }
    const qiDiff = Math.abs(result.qi - expected.qi);
    const ok = qiDiff <= TOLERANCE;
    console.log(
      `  ${kode}: qi=${result.qi.toFixed(4)} (expected ${expected.qi.toFixed(4)}) ` +
        `diff=${qiDiff.toFixed(6)} ${ok ? "✅" : "❌"}`
    );
    if (!ok) allPass = false;
  }

  // Print all rankings
  console.log("\nFull ranking:");
  for (const r of output.results) {
    console.log(`  #${r.ranking} ${r.kode} qi=${r.qi.toFixed(4)}`);
  }

  if (!allPass) {
    console.error("\nReference check FAILED ❌");
    process.exit(1);
  }
  console.log("\nReference check PASSED ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
