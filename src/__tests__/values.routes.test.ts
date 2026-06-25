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

describe("GET /api/values", () => {
  it("should return all values with cafe + criteria info", async () => {
    const res = await request(app).get("/api/values");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(60);
    expect(res.body.data[0].cafe).toBeDefined();
    expect(res.body.data[0].criteria).toBeDefined();
  });
});

describe("POST /api/values (protected)", () => {
  it("should return 401 without token", async () => {
    const res = await request(app)
      .post("/api/values")
      .send({ cafeId: 1, criteriaId: 1, nilai: 50 });
    expect(res.status).toBe(401);
  });

  it("should upsert a value", async () => {
    const cafe = await prisma.cafe.findFirst({ orderBy: { kode: "asc" } });
    const crit = await prisma.criteria.findFirst({ orderBy: { kode: "asc" } });
    const res = await request(app)
      .post("/api/values")
      .set("Authorization", `Bearer ${token}`)
      .send({ cafeId: cafe!.id, criteriaId: crit!.id, nilai: 999.99 });
    expect(res.status).toBe(201);
    expect(res.body.data.nilai).toBe(999.99);

    // Restore
    await prisma.alternativeValue.upsert({
      where: { cafeId_criteriaId: { cafeId: cafe!.id, criteriaId: crit!.id } },
      create: { cafeId: cafe!.id, criteriaId: crit!.id, nilai: 104.21 },
      update: { nilai: 104.21 },
    });
  });
});

describe("POST /api/values/batch (protected)", () => {
  it("should batch upsert values", async () => {
    const cafe = await prisma.cafe.findFirst({ orderBy: { kode: "asc" } });
    const crits = await prisma.criteria.findMany({ take: 2, orderBy: { urutan: "asc" } });
    const res = await request(app)
      .post("/api/values/batch")
      .set("Authorization", `Bearer ${token}`)
      .send({
        values: [
          { cafeId: cafe!.id, criteriaId: crits[0]!.id, nilai: 111 },
          { cafeId: cafe!.id, criteriaId: crits[1]!.id, nilai: 222 },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);

    // Restore
    await prisma.alternativeValue.upsert({
      where: { cafeId_criteriaId: { cafeId: cafe!.id, criteriaId: crits[0]!.id } },
      create: { cafeId: cafe!.id, criteriaId: crits[0]!.id, nilai: 104.21 },
      update: { nilai: 104.21 },
    });
    await prisma.alternativeValue.upsert({
      where: { cafeId_criteriaId: { cafeId: cafe!.id, criteriaId: crits[1]!.id } },
      create: { cafeId: cafe!.id, criteriaId: crits[1]!.id, nilai: 13 },
      update: { nilai: 13 },
    });
  });

  it("should reject invalid batch", async () => {
    const res = await request(app)
      .post("/api/values/batch")
      .set("Authorization", `Bearer ${token}`)
      .send({ values: [{ cafeId: -1, criteriaId: -1, nilai: 0 }] });
    expect(res.status).toBe(422);
  });
});
