import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { validate } from "../middleware/validate.js";
import {
  presetCreateSchema,
  presetUpdateSchema,
} from "./schemas/userWeighting.js";
import * as presetService from "../services/presetService.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const presets = await presetService.listPresets();
    res.json({ success: true, data: presets.slice(0, 50) });
  } catch (e) {
    next(e);
  }
});

router.post(
  "/",
  requireAdmin,
  validate(presetCreateSchema),
  async (req, res, next) => {
    try {
      const preset = await presetService.createPreset(req.body);
      res.status(201).json({ success: true, data: preset });
    } catch (e) {
      next(e);
    }
  }
);

router.put(
  "/:id",
  requireAdmin,
  validate(presetUpdateSchema),
  async (req, res, next) => {
    try {
      const id = parseInt(String(req.params["id"]), 10);
      const preset = await presetService.updatePreset(id, req.body);
      res.json({ success: true, data: preset });
    } catch (e) {
      next(e);
    }
  }
);

router.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(String(req.params["id"]), 10);
    await presetService.deletePreset(id);
    res.json({ success: true, message: "Preset berhasil dihapus" });
  } catch (e) {
    next(e);
  }
});

export default router;
