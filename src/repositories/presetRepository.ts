import prisma from "../lib/prisma.js";

export async function findAll() {
  return prisma.weightPreset.findMany({
    orderBy: { createdAt: "desc" },
    include: { weights: true },
  });
}

export async function findById(id: number) {
  return prisma.weightPreset.findUnique({
    where: { id },
    include: { weights: true },
  });
}

export async function findByName(name: string) {
  return prisma.weightPreset.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    include: { weights: true },
  });
}

export async function create(data: {
  name: string;
  description?: string;
  weights: { criteriaId: number; bobot: number }[];
}) {
  return prisma.weightPreset.create({
    data: {
      name: data.name,
      description: data.description,
      weights: {
        create: data.weights.map((w) => ({
          criteriaId: w.criteriaId,
          bobot: w.bobot,
        })),
      },
    },
    include: { weights: true },
  });
}

export async function update(
  id: number,
  data: {
    name?: string;
    description?: string;
    weights?: { criteriaId: number; bobot: number }[];
  }
) {
  return prisma.$transaction(async (tx) => {
    // If weights are provided, replace them entirely
    if (data.weights) {
      await tx.presetWeight.deleteMany({ where: { presetId: id } });
      await tx.presetWeight.createMany({
        data: data.weights.map((w) => ({
          presetId: id,
          criteriaId: w.criteriaId,
          bobot: w.bobot,
        })),
      });
    }

    return tx.weightPreset.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
      },
      include: { weights: true },
    });
  });
}

export async function remove(id: number) {
  return prisma.weightPreset.delete({ where: { id } });
}
