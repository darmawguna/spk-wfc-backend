import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../lib/env.js";
import { AppError } from "../middleware/error.js";
import * as adminRepo from "../repositories/adminRepository.js";

const BCRYPT_COST = 12;

export async function login(email: string, password: string) {
  const admin = await adminRepo.findByEmail(email);
  if (!admin) {
    // Constant-time: hash a dummy to prevent timing attacks
    await bcrypt.hash("dummy-bcrypt-operation", BCRYPT_COST);
    throw new AppError(401, "Email atau password salah");
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    throw new AppError(401, "Email atau password salah");
  }

  const payload = { id: admin.id, email: admin.email, nama: admin.nama };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

  // Calculate expiresAt from the token
  const decoded = jwt.decode(token) as { exp: number };
  const expiresAt = new Date(decoded.exp * 1000).toISOString();

  return { token, admin: { id: admin.id, email: admin.email, nama: admin.nama }, expiresAt };
}

export async function changePassword(adminId: number, oldPassword: string, newPassword: string) {
  const admin = await adminRepo.findById(adminId);
  if (!admin) {
    throw new AppError(404, "Admin tidak ditemukan");
  }

  const valid = await bcrypt.compare(oldPassword, admin.passwordHash);
  if (!valid) {
    throw new AppError(401, "Password lama salah");
  }

  if (newPassword.length < 6) {
    throw new AppError(422, "Password baru minimal 6 karakter", {
      newPassword: ["Password baru minimal 6 karakter"],
    });
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await adminRepo.updatePassword(adminId, passwordHash);
  return { message: "Password berhasil diubah" };
}
