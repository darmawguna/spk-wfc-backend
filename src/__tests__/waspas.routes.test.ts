import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import prisma from "../lib/prisma.js";
import bcrypt from "bcryptjs";

let token: string;

beforeAll(async () => {
  // Ensure seed state: remove any leftover criteria from earlier tests
  await prisma.criteria.deleteMany({ where: { kode: { startsWith: "K" }, urutan: { gt: 10 } } });
  await prisma.criteria.deleteMany({ where: { kode: "K99" } });

  const admin = await prisma.admin.findFirst({ where: { email: "admin@spk.local" } });
  if (!admin) {
    const hash = await bcrypt.hash("admin123", 12);
    await prisma.admin.create({ data: { email: "admin@spk.local", passwordHash: hash, nama: "Admin SPK" } });
  }
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@spk.local", password: "admin123" });
  token = res.body.data.token;
});

describe("POST /api/waspas/calculate (protected)", () => {
  it("should return 401 without token", async () => {
    const res = await request(app).post("/api/waspas/calculate");
    expect(res.status).toBe(401);
  });

  it("should calculate and return results", async () => {
    const res = await request(app)
      .post("/api/waspas/calculate")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.results).toBeDefined();
    expect(res.body.data.results.length).toBe(10);

    // A10 should be #1
    const a10 = res.body.data.results.find((r: any) => r.kode === "A10");
    expect(a10).toBeDefined();
    expect(a10.ranking).toBe(1);
    expect(a10.qi).toBeCloseTo(0.7541, 4);

    // Keunggulan should be present
    expect(res.body.data.keunggulan.length).toBeGreaterThan(0);
  });
});

describe("GET /api/waspas/results", () => {
  it("should return persisted results", async () => {
    const res = await request(app).get("/api/waspas/results");
    expect(res.status).toBe(200);
    expect(res.body.data.results.length).toBe(10);
    expect(res.body.data.results[0].ranking).toBe(1);
    // Should include cafe info
    expect(res.body.data.results[0].cafe).toBeDefined();
    expect(res.body.data.results[0].cafe.nama).toBeDefined();
  });
});

describe("GET /api/waspas/results/:cafe_id", () => {
  it("should return result for a specific cafe", async () => {
    const all = await prisma.waspasResult.findMany({ take: 1 });
    if (all.length === 0) return; // skip if no data
    const res = await request(app).get(`/api/waspas/results/${all[0]!.cafeId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.cafeId).toBe(all[0]!.cafeId);
  });

  it("should return 404 for non-existent cafe", async () => {
    const res = await request(app).get("/api/waspas/results/99999");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/waspas/recommendation", () => {
  it("should return the #1 recommendation", async () => {
    const all = await prisma.waspasResult.findMany({ take: 1 });
    if (all.length === 0) return;
    const res = await request(app).get("/api/waspas/recommendation");
    expect(res.status).toBe(200);
    expect(res.body.data.ranking).toBe(1);
    expect(res.body.data.unggulan).toBeDefined();
  });
});
