import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { AppError } from "../middleware/error.js";
import * as repo from "../repositories/cafeRepository.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const result = await repo.findAll();
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

router.post("/", requireAdmin, validate(repo.cafeCreateSchema), async (req, res, next) => {
  try {
    const cafe = await repo.create(req.body as z.infer<typeof repo.cafeCreateSchema>);
    res.status(201).json({ success: true, data: cafe });
  } catch (e) {
    next(e);
  }
});

router.put("/:id", requireAdmin, validate(repo.cafeUpdateSchema), async (req, res, next) => {
  try {
    const id = parseInt(String(req.params["id"]), 10);
    const existing = await repo.findById(id);
    if (!existing) throw new AppError(404, "Cafe tidak ditemukan");
    const cafe = await repo.update(id, req.body as z.infer<typeof repo.cafeUpdateSchema>);
    res.json({ success: true, data: cafe });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(String(req.params["id"]), 10);
    const existing = await repo.findById(id);
    if (!existing) throw new AppError(404, "Cafe tidak ditemukan");
    await repo.remove(id);
    res.json({ success: true, data: null });
  } catch (e) {
    next(e);
  }
});

export default router;
