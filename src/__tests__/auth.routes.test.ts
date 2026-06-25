import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import prisma from "../lib/prisma.js";
import bcrypt from "bcryptjs";

const LOGIN_URL = "/api/auth/login";
const CHANGE_PW_URL = "/api/auth/password";

let token: string;

beforeAll(async () => {
  // Ensure seed admin exists
  const existing = await prisma.admin.findFirst({ where: { email: "admin@spk.local" } });
  if (!existing) {
    const hash = await bcrypt.hash("admin123", 12);
    await prisma.admin.create({
      data: { email: "admin@spk.local", passwordHash: hash, nama: "Admin SPK" },
    });
  }

  // Reset test admin password to known state
  const admin = await prisma.admin.findFirst({ where: { email: "admin@spk.local" } });
  if (admin) {
    const hash = await bcrypt.hash("admin123", 12);
    await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash: hash } });
  }
});

describe("POST /api/auth/login", () => {
  it("should return 200 + token for valid credentials", async () => {
    const res = await request(app)
      .post(LOGIN_URL)
      .send({ email: "admin@spk.local", password: "admin123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.admin).toBeDefined();
    expect(res.body.data.admin.email).toBe("admin@spk.local");
    expect(res.body.data.expiresAt).toBeDefined();

    token = res.body.data.token; // store for subsequent tests
  });

  it("should return 401 for wrong password", async () => {
    const res = await request(app)
      .post(LOGIN_URL)
      .send({ email: "admin@spk.local", password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 422 for invalid email format", async () => {
    const res = await request(app)
      .post(LOGIN_URL)
      .send({ email: "not-an-email", password: "admin123" });

    expect(res.status).toBe(422);
  });
});

describe("POST /api/auth/password", () => {
  it("should return 401 without token", async () => {
    const res = await request(app)
      .post(CHANGE_PW_URL)
      .send({ oldPassword: "admin123", newPassword: "newpassword123" });

    expect(res.status).toBe(401);
  });

  it("should return 422 for weak new password", async () => {
    const res = await request(app)
      .post(CHANGE_PW_URL)
      .set("Authorization", `Bearer ${token}`)
      .send({ oldPassword: "admin123", newPassword: "12345" });

    expect(res.status).toBe(422);
  });

  it("should return 200 for valid password change", async () => {
    const res = await request(app)
      .post(CHANGE_PW_URL)
      .set("Authorization", `Bearer ${token}`)
      .send({ oldPassword: "admin123", newPassword: "newpassword123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Change back
    const res2 = await request(app)
      .post(CHANGE_PW_URL)
      .set("Authorization", `Bearer ${token}`)
      .send({ oldPassword: "newpassword123", newPassword: "admin123" });

    expect(res2.status).toBe(200);
  });

  it("should return 401 with wrong old password", async () => {
    const res = await request(app)
      .post(CHANGE_PW_URL)
      .set("Authorization", `Bearer ${token}`)
      .send({ oldPassword: "wrong-old-password", newPassword: "newpassword123" });

    expect(res.status).toBe(401);
  });
});
