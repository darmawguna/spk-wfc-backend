import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { AppError } from "../middleware/error.js";
import * as repo from "../repositories/criteriaRepository.js";
import { BobotSumError } from "../repositories/criteriaRepository.js";
import { assertBobotSumEqualsOne } from "../services/bobotValidator.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const data = await repo.findAll();
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

router.post("/", requireAdmin, validate(repo.criteriaCreateSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof repo.criteriaCreateSchema>;
    await assertBobotSumEqualsOne(undefined, body.bobot ?? 0);
    const item = await repo.create(body);
    res.status(201).json({ success: true, data: item });
  } catch (e) {
    if (e instanceof BobotSumError) {
      next(new AppError(422, e.message));
    } else {
      next(e);
    }
  }
});

const bobotBatchSchema = z.object({
  weights: z.array(z.object({ id: z.number().int().positive(), bobot: z.number().min(0).max(1) })).min(1),
});

router.put("/bobot", requireAdmin, validate(bobotBatchSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof bobotBatchSchema>;
    // Validate total sum
    const total = body.weights.reduce((s, w) => s + w.bobot, 0);
    if (Math.abs(total - 1) > 0.001) {
      throw new AppError(422, `Total bobot harus = 1.00 (saat ini: ${total.toFixed(4)})`);
    }
    // Update all in parallel (sum already validated; safe to do in any order)
    const updated = await Promise.all(
      body.weights.map((w) => repo.update(w.id, { bobot: w.bobot }))
    );
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
});

router.put("/:id", requireAdmin, validate(repo.criteriaUpdateSchema), async (req, res, next) => {
  try {
    const id = parseInt(String(req.params["id"]), 10);
    const existing = await repo.findById(id);
    if (!existing) throw new AppError(404, "Kriteria tidak ditemukan");

    const body = req.body as z.infer<typeof repo.criteriaUpdateSchema>;
    if (body.bobot !== undefined) {
      await assertBobotSumEqualsOne(id, body.bobot);
    }

    const item = await repo.update(id, body);
    res.json({ success: true, data: item });
  } catch (e) {
    if (e instanceof BobotSumError) {
      next(new AppError(422, e.message));
    } else {
      next(e);
    }
  }
});

router.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(String(req.params["id"]), 10);
    const existing = await repo.findById(id);
    if (!existing) throw new AppError(404, "Kriteria tidak ditemukan");
    await repo.remove(id);
    res.json({ success: true, data: null });
  } catch (e) {
    if (e instanceof BobotSumError) {
      next(new AppError(409, e.message));
    } else {
      next(e);
    }
  }
});

export default router;
