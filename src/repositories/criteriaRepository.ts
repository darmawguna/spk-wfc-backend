import prisma from "../lib/prisma.js";
import { z } from "zod";

export const criteriaCreateSchema = z.object({
  kode: z.string().min(1, "Kode wajib diisi"),
  nama: z.string().min(1, "Nama wajib diisi"),
  jenis: z.enum(["benefit", "cost"], { message: 'Jenis harus "benefit" atau "cost"' }),
  satuan: z.string().nullable().optional(),
  bobot: z.number().min(0).max(1).optional().default(0),
  urutan: z.number().int().min(1).optional(),
});

export const criteriaUpdateSchema = z.object({
  kode: z.string().min(1).optional(),
  nama: z.string().min(1).optional(),
  jenis: z.enum(["benefit", "cost"]).optional(),
  satuan: z.string().nullable().optional(),
  bobot: z.number().min(0).max(1).optional(),
  urutan: z.number().int().min(1).optional(),
});

export async function findAll() {
  return prisma.criteria.findMany({ orderBy: { urutan: "asc" } });
}

export async function findById(id: number) {
  return prisma.criteria.findUnique({ where: { id } });
}

export async function create(data: z.infer<typeof criteriaCreateSchema>) {
  const max = await prisma.criteria.aggregate({ _max: { urutan: true } });
  return prisma.criteria.create({
    data: { ...data, urutan: data.urutan ?? (max._max.urutan ?? 0) + 1 },
  });
}

export async function update(id: number, data: z.infer<typeof criteriaUpdateSchema>) {
  return prisma.criteria.update({ where: { id }, data });
}

export async function remove(id: number) {
  // Check for referencing values
  const count = await prisma.alternativeValue.count({ where: { criteriaId: id } });
  if (count > 0) {
    throw new BobotSumError(`Kriteria masih memiliki ${count} data nilai. Hapus nilai terlebih dahulu.`);
  }
  return prisma.criteria.delete({ where: { id } });
}

export class BobotSumError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BobotSumError";
  }
}
