import prisma from "../lib/prisma.js";
import { BobotSumError } from "../repositories/criteriaRepository.js";

const TOLERANCE = 0.001;

/**
 * Assert that the sum of all criteria bobot equals 1 (within tolerance).
 * If excludeId is provided, that criteria's bobot is excluded from the sum
 * (useful when updating a criteria's bobot).
 */
export async function assertBobotSumEqualsOne(excludeId?: number, newBobot?: number): Promise<number> {
  const all = await prisma.criteria.findMany();
  let total = all.reduce((sum, c) => {
    if (excludeId && c.id === excludeId) return sum;
    return sum + c.bobot;
  }, 0);

  if (newBobot !== undefined) {
    total += newBobot;
  }

  if (Math.abs(total - 1) > TOLERANCE) {
    throw new BobotSumError(`Total bobot harus = 1.00 (saat ini: ${total.toFixed(4)})`);
  }

  return total;
}
