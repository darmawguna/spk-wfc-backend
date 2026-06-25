import prisma from "../lib/prisma.js";
import { z } from "zod";

export const valueUpsertSchema = z.object({
  cafeId: z.number().int().positive(),
  criteriaId: z.number().int().positive(),
  nilai: z.number(),
});

export const batchUpsertSchema = z.object({
  values: z.array(valueUpsertSchema).min(1),
});

export async function findAll() {
  return prisma.alternativeValue.findMany({
    include: { cafe: { select: { id: true, kode: true, nama: true } }, criteria: true },
    orderBy: [{ cafeId: "asc" }, { criteriaId: "asc" }],
  });
}

export async function upsert(data: { cafeId: number; criteriaId: number; nilai: number }) {
  return prisma.alternativeValue.upsert({
    where: { cafeId_criteriaId: { cafeId: data.cafeId, criteriaId: data.criteriaId } },
    create: data,
    update: { nilai: data.nilai },
  });
}

export async function batchUpsert(values: { cafeId: number; criteriaId: number; nilai: number }[]) {
  return prisma.$transaction(values.map((v) => prisma.alternativeValue.upsert({
    where: { cafeId_criteriaId: { cafeId: v.cafeId, criteriaId: v.criteriaId } },
    create: v,
    update: { nilai: v.nilai },
  })));
}
