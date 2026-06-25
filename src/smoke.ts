/**
 * Smoke test: boots server in-process, seeds DB, calls GET /api/waspas/results,
 * and asserts A10 has ranking: 1, qi: 0.7541.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import app from "./app.js";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Smoke Test ===");

  // Seed
  console.log("Seeding...");
  await prisma.waspasResult.deleteMany();
  await prisma.alternativeValue.deleteMany();
  await prisma.criteria.deleteMany();
  await prisma.cafe.deleteMany();
  await prisma.admin.deleteMany();

  const hash = await bcrypt.hash("admin123", 12);
  await prisma.admin.create({ data: { email: "admin@spk.local", passwordHash: hash, nama: "Admin SPK" } });

  const cafes = [
    { kode: "A1", nama: "Sanchi House", alamat: "Jl. Ahmad Yani No. 45", linkMaps: "https://maps.google.com/?q=Sanchi+House", photo: null },
    { kode: "A2", nama: "Ko Vaitnam", alamat: "Jl. Veteran No. 12", linkMaps: "https://maps.google.com/?q=Ko+Vaitnam", photo: null },
    { kode: "A3", nama: "Maison Utara", alamat: "Jl. Pahlawan No. 88", linkMaps: "https://maps.google.com/?q=Maison+Utara", photo: null },
    { kode: "A4", nama: "Pridi Cafe", alamat: "Jl. Pridi No. 27", linkMaps: "https://maps.google.com/?q=Pridi+Cafe", photo: null },
    { kode: "A5", nama: "Joompa Kopi", alamat: "Jl. Pattimura No. 5", linkMaps: "https://maps.google.com/?q=Joompa+Kopi", photo: null },
    { kode: "A6", nama: "nAu", alamat: "Jl. Sudirman No. 78", linkMaps: "https://maps.google.com/?q=nAu", photo: null },
    { kode: "A7", nama: "Rumah Kopi Nusantara", alamat: "Jl. Nusantara No. 14", linkMaps: "https://maps.google.com/?q=Rumah+Kopi+Nusantara", photo: null },
    { kode: "A8", nama: "Abuela Coffee", alamat: "Jl. Mawar No. 3", linkMaps: "https://maps.google.com/?q=Abuela+Coffee", photo: null },
    { kode: "A9", nama: "Kopi Kenangan", alamat: "Jl. Gatot Subroto No. 90", linkMaps: "https://maps.google.com/?q=Kopi+Kenangan", photo: null },
    { kode: "A10", nama: "Tomoro Coffee", alamat: "Jl. Soekarno Hatta No. 123", linkMaps: "https://maps.google.com/?q=Tomoro+Coffee", photo: null },
  ];

  for (const c of cafes) {
    await prisma.cafe.create({ data: c });
  }

  const criterias = [
    { kode: "K1", nama: "Kecepatan Internet", jenis: "benefit", satuan: "Mbps", bobot: 0.30, urutan: 1 },
    { kode: "K2", nama: "Jumlah Stop Kontak", jenis: "benefit", satuan: "unit", bobot: 0.20, urutan: 2 },
    { kode: "K3", nama: "Jarak dari Kampus", jenis: "cost", satuan: "km", bobot: 0.15, urutan: 3 },
    { kode: "K4", nama: "Harga Menu Termurah", jenis: "cost", satuan: "Rp", bobot: 0.15, urutan: 4 },
    { kode: "K5", nama: "Jam Operasional", jenis: "benefit", satuan: "jam", bobot: 0.10, urutan: 5 },
    { kode: "K6", nama: "Fasilitas Umum", jenis: "benefit", satuan: "poin", bobot: 0.10, urutan: 6 },
  ];

  for (const c of criterias) {
    await prisma.criteria.create({ data: c });
  }

  // Values
  const cafeRows = await prisma.cafe.findMany({ orderBy: { kode: "asc" } });
  const criteriaRows = await prisma.criteria.findMany({ orderBy: { kode: "asc" } });
  const valueData: Record<string, Record<string, number>> = {
    A1: { K1: 104.21, K2: 13, K3: 0.55, K4: 12000, K5: 15, K6: 2 },
    A2: { K1: 20.23, K2: 1, K3: 0.75, K4: 6000, K5: 13.5, K6: 3 },
    A3: { K1: 32.34, K2: 13, K3: 0.40, K4: 13000, K5: 14, K6: 5 },
    A4: { K1: 52.23, K2: 15, K3: 0.45, K4: 12000, K5: 17, K6: 3 },
    A5: { K1: 12.67, K2: 1, K3: 2.50, K4: 5000, K5: 12, K6: 2 },
    A6: { K1: 68.82, K2: 10, K3: 0.30, K4: 10000, K5: 14, K6: 4 },
    A7: { K1: 18.19, K2: 5, K3: 0.55, K4: 15000, K5: 14, K6: 4 },
    A8: { K1: 13.99, K2: 10, K3: 1.80, K4: 5000, K5: 12, K6: 3 },
    A9: { K1: 30.38, K2: 26, K3: 0.85, K4: 19000, K5: 15, K6: 2 },
    A10: { K1: 96.38, K2: 31, K3: 0.12, K4: 20000, K5: 15, K6: 2 },
  };

  const criteriaMap = new Map(criteriaRows.map((c) => [c.kode, c.id]));
  for (const cafe of cafeRows) {
    const row = valueData[cafe.kode];
    if (!row) continue;
    for (const [k, nilai] of Object.entries(row)) {
      const criteriaId = criteriaMap.get(k);
      if (!criteriaId) continue;
      await prisma.alternativeValue.create({ data: { cafeId: cafe.id, criteriaId, nilai } });
    }
  }

  // Login
  const loginRes = await fetch("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@spk.local", password: "admin123" }),
  });
  const loginData = await loginRes.json() as { success: boolean; data: { token: string } };
  if (!loginData.success) throw new Error("Login failed");

  // Calculate
  const calcRes = await fetch("http://localhost:3001/api/waspas/calculate", {
    method: "POST",
    headers: { Authorization: `Bearer ${loginData.data.token}` },
  });
  const calcData = await calcRes.json() as { success: boolean; data: { results: Array<{ kode: string; ranking: number; qi: number }> } };
  if (!calcData.success) throw new Error("Calculate failed");

  // Find A10
  const a10 = calcData.data.results.find((r) => r.kode === "A10");
  if (!a10) throw new Error("A10 not found in results");
  if (a10.ranking !== 1) throw new Error(`A10 ranking expected 1, got ${a10.ranking}`);
  if (Math.abs(a10.qi - 0.7541) > 0.0001) {
    throw new Error(`A10 qi expected 0.7541 ± 0.0001, got ${a10.qi}`);
  }

  console.log(`A10: ranking=${a10.ranking}, qi=${a10.qi.toFixed(4)}`);
  console.log("Smoke test PASSED ✅");
}

main()
  .catch((e) => {
    console.error("Smoke test FAILED ❌", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
