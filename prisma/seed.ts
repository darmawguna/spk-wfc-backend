import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CAFE_DATA = [
  { kode: "A1", nama: "Sanchi House", alamat: "Jl. Ahmad Yani No. 45" },
  { kode: "A2", nama: "Ko Vaitnam", alamat: "Jl. Veteran No. 12" },
  { kode: "A3", nama: "Maison Utara", alamat: "Jl. Pahlawan No. 88" },
  { kode: "A4", nama: "Pridi Cafe", alamat: "Jl. Pridi No. 27" },
  { kode: "A5", nama: "Joompa Kopi", alamat: "Jl. Pattimura No. 5" },
  { kode: "A6", nama: "nAu", alamat: "Jl. Sudirman No. 78" },
  { kode: "A7", nama: "Rumah Kopi Nusantara", alamat: "Jl. Nusantara No. 14" },
  { kode: "A8", nama: "Abuela Coffee", alamat: "Jl. Mawar No. 3" },
  { kode: "A9", nama: "Kopi Kenangan", alamat: "Jl. Gatot Subroto No. 90" },
  { kode: "A10", nama: "Tomoro Coffee", alamat: "Jl. Soekarno Hatta No. 123" },
];

const CRITERIA_DATA = [
  { kode: "K1", nama: "Kecepatan Internet", jenis: "benefit", satuan: "Mbps", bobot: 0.30, urutan: 1 },
  { kode: "K2", nama: "Jumlah Stop Kontak", jenis: "benefit", satuan: "unit", bobot: 0.20, urutan: 2 },
  { kode: "K3", nama: "Jarak dari Kampus", jenis: "cost", satuan: "km", bobot: 0.15, urutan: 3 },
  { kode: "K4", nama: "Harga Menu Termurah", jenis: "cost", satuan: "Rp", bobot: 0.15, urutan: 4 },
  { kode: "K5", nama: "Jam Operasional", jenis: "benefit", satuan: "jam", bobot: 0.10, urutan: 5 },
  { kode: "K6", nama: "Fasilitas Umum", jenis: "benefit", satuan: "poin", bobot: 0.10, urutan: 6 },
];

const VALUE_DATA: Record<string, Record<string, number>> = {
  A1:  { K1: 104.21, K2: 13, K3: 0.55, K4: 12000, K5: 15, K6: 2 },
  A2:  { K1: 20.23,  K2: 1,  K3: 0.75, K4: 6000,  K5: 13.5, K6: 3 },
  A3:  { K1: 32.34,  K2: 13, K3: 0.40, K4: 13000, K5: 14, K6: 5 },
  A4:  { K1: 52.23,  K2: 15, K3: 0.45, K4: 12000, K5: 17, K6: 3 },
  A5:  { K1: 12.67,  K2: 1,  K3: 2.50, K4: 5000,  K5: 12, K6: 2 },
  A6:  { K1: 68.82,  K2: 10, K3: 0.30, K4: 10000, K5: 14, K6: 4 },
  A7:  { K1: 18.19,  K2: 5,  K3: 0.55, K4: 15000, K5: 14, K6: 4 },
  A8:  { K1: 13.99,  K2: 10, K3: 1.80, K4: 5000,  K5: 12, K6: 3 },
  A9:  { K1: 30.38,  K2: 26, K3: 0.85, K4: 19000, K5: 15, K6: 2 },
  A10: { K1: 96.38,  K2: 31, K3: 0.12, K4: 20000, K5: 15, K6: 2 },
};

async function main() {
  console.log("Seeding database...");

  // Wipe existing data
  await prisma.waspasResult.deleteMany();
  await prisma.alternativeValue.deleteMany();
  await prisma.criteria.deleteMany();
  await prisma.cafe.deleteMany();
  await prisma.admin.deleteMany();

  // Admin
  const passwordHash = await bcrypt.hash("admin123", 12);
  await prisma.admin.create({
    data: { email: "admin@spk.local", passwordHash, nama: "Admin SPK" },
  });
  console.log("  ✔ Admin created");

  // Cafes
  for (const c of CAFE_DATA) {
    await prisma.cafe.create({
      data: {
        ...c,
        linkMaps: `https://maps.google.com/?q=${encodeURIComponent(c.nama)}`,
        photo: null,
      },
    });
  }
  console.log(`  ✔ ${CAFE_DATA.length} cafes created`);

  // Criterias
  for (const c of CRITERIA_DATA) {
    await prisma.criteria.create({ data: c });
  }
  console.log(`  ✔ ${CRITERIA_DATA.length} criterias created`);

  // Values
  const cafes = await prisma.cafe.findMany({ orderBy: { kode: "asc" } });
  const criteriaMap = new Map(
    (await prisma.criteria.findMany({ orderBy: { kode: "asc" } })).map((c) => [c.kode, c.id])
  );

  let valueCount = 0;
  for (const cafe of cafes) {
    const row = VALUE_DATA[cafe.kode];
    if (!row) continue;
    for (const [criteriaKode, nilai] of Object.entries(row)) {
      const criteriaId = criteriaMap.get(criteriaKode);
      if (!criteriaId) continue;
      await prisma.alternativeValue.create({
        data: { cafeId: cafe.id, criteriaId, nilai },
      });
      valueCount++;
    }
  }
  console.log(`  ✔ ${valueCount} alternative values created`);
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
