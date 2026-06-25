import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { AppError } from "../middleware/error.js";
import * as waspasRepo from "../repositories/waspasRepository.js";
import { runCalculation } from "../services/calculateService.js";

const router = Router();

router.post("/calculate", requireAdmin, async (_req, res, next) => {
  try {
    const result = await runCalculation();
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

router.get("/results", async (_req, res, next) => {
  try {
    const data = await waspasRepo.findAll();
    res.json({ success: true, data: { calculated_at: data.length > 0 ? new Date().toISOString() : null, results: data } });
  } catch (e) {
    next(e);
  }
});

router.get("/results/:cafe_id", async (req, res, next) => {
  try {
    const cafeId = parseInt(String(req.params["cafe_id"]), 10);
    const data = await waspasRepo.findByCafeId(cafeId);
    if (!data) throw new AppError(404, "Hasil tidak ditemukan untuk cafe tersebut");
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

router.get("/recommendation", async (_req, res, next) => {
  try {
    const all = await waspasRepo.findAll();
    if (all.length === 0) throw new AppError(404, "Belum ada hasil perhitungan");
    const top = all[0]!;
    res.json({
      success: true,
      data: {
        cafeId: top.cafeId,
        cafe: top.cafe,
        qi: top.qi,
        ranking: top.ranking,
        unggulan: [],
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
