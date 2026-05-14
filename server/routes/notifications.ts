import { Router, type Request, type Response } from "express";
import { z } from "zod";

const router = Router();

router.get("/notification-preferences", async (_req: Request, res: Response) => {
  res.json({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    notificationThreshold: 10,
  });
});

router.put("/notification-preferences", async (req: Request, res: Response) => {
  const parsed = z
    .object({
      emailNotifications: z.boolean().optional(),
      pushNotifications: z.boolean().optional(),
      smsNotifications: z.boolean().optional(),
      notificationThreshold: z.number().int().min(1).max(100).optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_BODY", details: parsed.error.flatten() });
    return;
  }

  res.json({ success: true, preferences: parsed.data });
});

export default router;

