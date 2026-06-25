import prisma from "../lib/prisma.js";

export async function findByEmail(email: string) {
  return prisma.admin.findFirst({
    where: { email: email.toLowerCase() },
  });
}

export async function findById(id: number) {
  return prisma.admin.findUnique({ where: { id } });
}

export async function create(data: { email: string; passwordHash: string; nama: string }) {
  return prisma.admin.create({ data });
}

export async function updatePassword(id: number, passwordHash: string) {
  return prisma.admin.update({
    where: { id },
    data: { passwordHash },
  });
}
