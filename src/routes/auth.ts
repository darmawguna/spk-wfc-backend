import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import * as authService from "../services/authService.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password harus diisi"),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Password lama harus diisi"),
  newPassword: z.string().min(6, "Password baru minimal 6 karakter"),
});

router.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const result = await authService.login(email, password);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

router.post(
  "/password",
  requireAdmin,
  validate(changePasswordSchema),
  async (req, res, next) => {
    try {
      const { oldPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>;
      const result = await authService.changePassword(req.admin!.id, oldPassword, newPassword);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
