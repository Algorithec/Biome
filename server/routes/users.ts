import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { authOptional, authRequired } from "../middleware/auth";
import { userRepo } from "../repositories";

const router = Router();

router.get("/profile", authOptional(), async (req: Request, res: Response) => {
  const userId = req.ctx?.userId;
  if (!userId) {
    res.json({
      id: null,
      name: "Guest",
      email: null,
      phone: null,
      tier: "Free",
      totalSavings: 0,
    });
    return;
  }
  const user = await userRepo.getById(userId);
  res.json({
    id: user?.id ?? userId,
    name: user?.name ?? "User",
    email: user?.email ?? null,
    phone: user?.phone ?? null,
    tier: "Free",
    totalSavings: 0,
  });
});

router.get("/rewards", authOptional(), async (_req: Request, res: Response) => {
  res.json({
    totalCashback: 0,
    availableCashback: 0,
    pendingCashback: 0,
    tier: "Free",
  });
});

router.put("/profile", authRequired(), async (req: Request, res: Response) => {
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(80).optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "INVALID_BODY", details: parsed.error.flatten() });
    return;
  }

  const updated = await userRepo.updateById(req.ctx!.userId!, {
    name: parsed.data.name,
  });
  if (!updated) {
    res.status(404).json({ error: "USER_NOT_FOUND" });
    return;
  }

  res.json({
    success: true,
    user: {
      id: updated.id,
      name: updated.name ?? "User",
      email: updated.email ?? null,
      phone: updated.phone ?? null,
      preferences: updated.preferences ?? {},
    },
  });
});

router.put(
  "/preferences",
  authRequired(),
  async (req: Request, res: Response) => {
    const parsed = z.record(z.string(), z.unknown()).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "INVALID_BODY" });
      return;
    }
    const updated = await userRepo.updateById(req.ctx!.userId!, {
      preferences: parsed.data,
    });
    res.json({ success: true, preferences: parsed.data, user: updated });
  }
);

router.get(
  "/purchases",
  authRequired(),
  async (_req: Request, res: Response) => {
    res.json({ items: [] });
  }
);

export default router;
