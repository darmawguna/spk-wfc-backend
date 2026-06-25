import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import * as repo from "../repositories/valueRepository.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const data = await repo.findAll();
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

router.post("/", requireAdmin, validate(repo.valueUpsertSchema), async (req, res, next) => {
  try {
    const item = await repo.upsert(req.body as z.infer<typeof repo.valueUpsertSchema>);
    res.status(201).json({ success: true, data: item });
  } catch (e) {
    next(e);
  }
});

router.post("/batch", requireAdmin, validate(repo.batchUpsertSchema), async (req, res, next) => {
  try {
    const { values } = req.body as z.infer<typeof repo.batchUpsertSchema>;
    const items = await repo.batchUpsert(values);
    res.json({ success: true, data: items });
  } catch (e) {
    next(e);
  }
});

export default router;
