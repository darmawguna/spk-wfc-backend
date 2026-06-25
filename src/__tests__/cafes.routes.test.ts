import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import prisma from "../lib/prisma.js";
import bcrypt from "bcryptjs";

let token: string;

beforeAll(async () => {
  // Ensure admin + seed data
  const admin = await prisma.admin.findFirst({ where: { email: "admin@spk.local" } });
  if (!admin) {
    const hash = await bcrypt.hash("admin123", 12);
    await prisma.admin.create({ data: { email: "admin@spk.local", passwordHash: hash, nama: "Admin SPK" } });
  }
  // Login
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@spk.local", password: "admin123" });
  token = res.body.data.token;
});

describe("GET /api/cafes", () => {
  it("should return all cafes (public)", async () => {
    const res = await request(app).get("/api/cafes");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(10);
  });
});

describe("POST /api/cafes (protected)", () => {
  it("should return 401 without token", async () => {
    const res = await request(app)
      .post("/api/cafes")
      .send({ kode: "C99", nama: "Test Cafe", alamat: "Jl. Test" });
    expect(res.status).toBe(401);
  });

  it("should create a new cafe with valid token", async () => {
    const res = await request(app)
      .post("/api/cafes")
      .set("Authorization", `Bearer ${token}`)
      .send({ kode: "C99", nama: "Test Cafe", alamat: "Jl. Test No. 1", linkMaps: "https://maps.google.com/?q=test" });
    expect(res.status).toBe(201);
    expect(res.body.data.kode).toBe("C99");

    // Cleanup
    const cafe = await prisma.cafe.findFirst({ where: { kode: "C99" } });
    if (cafe) await prisma.cafe.delete({ where: { id: cafe.id } });
  });
});

describe("PUT /api/cafes/:id (protected)", () => {
  it("should update cafe name", async () => {
    const cafe = await prisma.cafe.findFirst({ orderBy: { kode: "asc" } });
    const res = await request(app)
      .put(`/api/cafes/${cafe!.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ nama: "Updated Cafe" });
    expect(res.status).toBe(200);
    expect(res.body.data.nama).toBe("Updated Cafe");

    // Restore
    await prisma.cafe.update({ where: { id: cafe!.id }, data: { nama: cafe!.nama } });
  });

  it("should return 404 on non-existent cafe", async () => {
    const res = await request(app)
      .put("/api/cafes/99999")
      .set("Authorization", `Bearer ${token}`)
      .send({ nama: "Noop" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/cafes/:id (protected)", () => {
  it("should delete a cafe and cascade values", async () => {
    // Create a fresh cafe to delete
    const cafe = await prisma.cafe.create({
      data: { kode: "CDEL", nama: "Delete Me", alamat: "Jl. Del" },
    });
    const res = await request(app)
      .delete(`/api/cafes/${cafe.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);

    const gone = await prisma.cafe.findUnique({ where: { id: cafe.id } });
    expect(gone).toBeNull();
  });

  it("should return 401 without token", async () => {
    const res = await request(app).delete("/api/cafes/1");
    expect(res.status).toBe(401);
  });
});
