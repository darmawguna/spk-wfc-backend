import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import prisma from "../lib/prisma.js";
import bcrypt from "bcryptjs";

let token: string;

beforeAll(async () => {
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

describe("GET /api/criterias", () => {
  it("should return all criterias ordered by urutan", async () => {
    const res = await request(app).get("/api/criterias");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(6);
    // Check ordering
    const urutans = res.body.data.map((c: any) => c.urutan);
    for (let i = 1; i < urutans.length; i++) {
      expect(urutans[i]).toBeGreaterThanOrEqual(urutans[i - 1]);
    }
  });
});

describe("POST /api/criterias (protected)", () => {
  it("should return 401 without token", async () => {
    const res = await request(app)
      .post("/api/criterias")
      .send({ kode: "K99", nama: "Test", jenis: "benefit", bobot: 0.1 });
    expect(res.status).toBe(401);
  });

  it("should reject if bobot sum would exceed 1", async () => {
    const res = await request(app)
      .post("/api/criterias")
      .set("Authorization", `Bearer ${token}`)
      .send({ kode: "K99", nama: "Test", jenis: "benefit", bobot: 0.5, satuan: "x" });
    expect(res.status).toBe(422);
    expect(res.body.message).toContain("bobot");
  });
});

describe("PUT /api/criterias/:id (protected)", () => {
  it("should reject bobot change that breaks the sum invariant", async () => {
    const k2 = await prisma.criteria.findFirst({ where: { kode: "K2" } });
    const res = await request(app)
      .put(`/api/criterias/${k2!.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bobot: 0.9 });
    expect(res.status).toBe(422);
  });

  it("should update a criteria property", async () => {
    const k1 = await prisma.criteria.findFirst({ where: { kode: "K1" } });
    const res = await request(app)
      .put(`/api/criterias/${k1!.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ nama: "Internet Speed" });
    expect(res.status).toBe(200);
    expect(res.body.data.nama).toBe("Internet Speed");
    // Restore
    await prisma.criteria.update({ where: { id: k1!.id }, data: { nama: "Kecepatan Internet" } });
  });
});

describe("PUT /api/criterias/bobot (protected)", () => {
  it("should return 401 without token", async () => {
    const all = await prisma.criteria.findMany();
    const res = await request(app)
      .put("/api/criterias/bobot")
      .send({ weights: all.map((c) => ({ id: c.id, bobot: c.bobot })) });
    expect(res.status).toBe(401);
  });

  it("should reject if total bobot != 1", async () => {
    const all = await prisma.criteria.findMany();
    const res = await request(app)
      .put("/api/criterias/bobot")
      .set("Authorization", `Bearer ${token}`)
      .send({ weights: all.map((c) => ({ id: c.id, bobot: 0.5 })) });
    expect(res.status).toBe(422);
    expect(res.body.message).toContain("bobot");
  });

  it("should update all bobot atomically when sum = 1", async () => {
    const all = await prisma.criteria.findMany();
    // Sanity: total is 1
    const total = all.reduce((s, c) => s + c.bobot, 0);
    expect(Math.abs(total - 1)).toBeLessThan(0.001);
    // Send all 6 weights (no change) — total should be 1
    const weights = all.map((c) => ({ id: c.id, bobot: c.bobot }));
    const res = await request(app)
      .put("/api/criterias/bobot")
      .set("Authorization", `Bearer ${token}`)
      .send({ weights });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(6);
    // Verify final sum still 1
    const final = await prisma.criteria.findMany();
    const sum = final.reduce((s, c) => s + c.bobot, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(0.001);
  });
});
