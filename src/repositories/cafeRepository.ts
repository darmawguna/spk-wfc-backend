import prisma from "../lib/prisma.js";
import { z } from "zod";

export const cafeCreateSchema = z.object({
  kode: z.string().min(1, "Kode wajib diisi"),
  nama: z.string().min(1, "Nama wajib diisi"),
  alamat: z.string().min(1, "Alamat wajib diisi"),
  linkMaps: z.string().nullable().optional(),
  photo: z.string().nullable().optional(),
});

export const cafeUpdateSchema = z.object({
  kode: z.string().min(1).optional(),
  nama: z.string().min(1).optional(),
  alamat: z.string().min(1).optional(),
  linkMaps: z.string().nullable().optional(),
  photo: z.string().nullable().optional(),
});

export async function findAll() {
  return prisma.cafe.findMany({ orderBy: { kode: "asc" } });
}

export async function findById(id: number) {
  return prisma.cafe.findUnique({ where: { id } });
}

export async function create(data: z.infer<typeof cafeCreateSchema>) {
  return prisma.cafe.create({ data });
}

export async function update(id: number, data: z.infer<typeof cafeUpdateSchema>) {
  return prisma.cafe.update({ where: { id }, data });
}

export async function remove(id: number) {
  // Cascade handled by Prisma (onDelete: Cascade on AlternativeValue + WaspasResult)
  return prisma.$transaction(async (tx) => {
    await tx.alternativeValue.deleteMany({ where: { cafeId: id } });
    await tx.waspasResult.deleteMany({ where: { cafeId: id } });
    return tx.cafe.delete({ where: { id } });
  });
}
