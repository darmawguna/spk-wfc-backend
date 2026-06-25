import prisma from "../lib/prisma.js";

export async function findAll() {
  return prisma.waspasResult.findMany({
    orderBy: { ranking: "asc" },
    include: { cafe: { select: { id: true, kode: true, nama: true, alamat: true, linkMaps: true } } },
  });
}

export async function findByCafeId(cafeId: number) {
  return prisma.waspasResult.findUnique({
    where: { cafeId },
    include: { cafe: { select: { id: true, kode: true, nama: true, alamat: true, linkMaps: true } } },
  });
}

export async function upsertMany(results: {
  cafeId: number;
  ranking: number;
  wsm: number;
  wpm: number;
  qi: number;
}[]) {
  return prisma.$transaction(async (tx) => {
    // Clear old results
    await tx.waspasResult.deleteMany();
    // Insert new
    for (const r of results) {
      await tx.waspasResult.create({ data: r });
    }
  });
}
