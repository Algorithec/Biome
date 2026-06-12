import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { authRequired } from "../middleware/auth";
import { orderRepo, userRepo } from "../repositories";

const router = Router();

function paymentsBaseUrl() {
  return process.env.PAYMENTS_SERVICE_URL || "http://localhost:4010";
}

const MoneySchema = z.object({
  currency: z.literal("INR"),
  amount: z.number().int().min(1),
});

const CreateOrderSchema = z.object({
  domain: z.enum(["ecommerce", "food", "rides", "travel", "hospitality"]),
  provider: z.string().trim().min(1),
  title: z.string().trim().min(1).max(140),
  itemUrl: z.string().url(),
  amount: MoneySchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
  paymentIntentId: z.string().trim().min(1).optional(),
});

router.post("/", authRequired(), async (req: Request, res: Response) => {
  const parsed = CreateOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "INVALID_BODY", details: parsed.error.flatten() });
    return;
  }

  const created = await orderRepo.create({
    userId: req.ctx!.userId!,
    domain: parsed.data.domain,
    provider: parsed.data.provider,
    title: parsed.data.title,
    itemUrl: parsed.data.itemUrl,
    amount: parsed.data.amount,
    status: parsed.data.paymentIntentId ? "PAYMENT_PENDING" : "CREATED",
    paymentIntentId: parsed.data.paymentIntentId,
    metadata: parsed.data.metadata,
  });

  res.json({ order: created });
});

router.get("/", authRequired(), async (req: Request, res: Response) => {
  const limit = z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .safeParse(req.query.limit);
  const items = await orderRepo.listByUser(
    req.ctx!.userId!,
    limit.success ? limit.data : 50
  );
  res.json({ items });
});

router.get("/:orderId", authRequired(), async (req: Request, res: Response) => {
  const orderId = req.params.orderId;
  const order = await orderRepo.getById(orderId);
  if (!order || order.userId !== req.ctx!.userId!) {
    res.status(404).json({ error: "ORDER_NOT_FOUND" });
    return;
  }
  res.json({ order });
});

router.post(
  "/:orderId/cancel",
  authRequired(),
  async (req: Request, res: Response) => {
    const orderId = req.params.orderId;
    const order = await orderRepo.getById(orderId);
    if (!order || order.userId !== req.ctx!.userId!) {
      res.status(404).json({ error: "ORDER_NOT_FOUND" });
      return;
    }
    if (order.status === "CONFIRMED") {
      res.status(409).json({ error: "ORDER_ALREADY_CONFIRMED" });
      return;
    }
    if (order.status === "CANCELLED") {
      res.json({ order });
      return;
    }
    const updated = await orderRepo.updateById(orderId, {
      status: "CANCELLED",
    });
    res.json({ order: updated ?? order });
  }
);

router.post(
  "/:orderId/payment-intent",
  authRequired(),
  async (req: Request, res: Response) => {
    const orderId = req.params.orderId;
    const order = await orderRepo.getById(orderId);
    if (!order || order.userId !== req.ctx!.userId!) {
      res.status(404).json({ error: "ORDER_NOT_FOUND" });
      return;
    }
    if (order.status === "CANCELLED") {
      res.status(409).json({ error: "ORDER_CANCELLED" });
      return;
    }
    if (order.status === "CONFIRMED") {
      res.status(409).json({ error: "ORDER_ALREADY_CONFIRMED" });
      return;
    }

    const parsed = z
      .object({
        customerPhone: z.string().trim().min(6).optional(),
        customerEmail: z.string().email().optional(),
        customerName: z.string().trim().min(1).max(80).optional(),
        returnUrl: z.string().url().optional(),
        notifyUrl: z.string().url().optional(),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "INVALID_BODY", details: parsed.error.flatten() });
      return;
    }

    const user = await userRepo.getById(req.ctx!.userId!);
    const customerPhone = parsed.data.customerPhone ?? user?.phone;
    if (!customerPhone) {
      res.status(400).json({ error: "MISSING_CUSTOMER_PHONE" });
      return;
    }

    const payload = {
      money: { amount: order.amount.amount, currency: order.amount.currency },
      customer: {
        customerId: req.ctx!.userId!,
        customerPhone,
        customerEmail: parsed.data.customerEmail ?? user?.email,
        customerName: parsed.data.customerName ?? user?.name,
      },
      returnUrl: parsed.data.returnUrl,
      notifyUrl: parsed.data.notifyUrl,
      orderId: order.id,
    };

    const r = await fetch(`${paymentsBaseUrl()}/v1/payment_intents`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": req.ctx!.userId!,
        "Idempotency-Key": `order_${order.id}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await r.text();
    if (!r.ok) {
      res
        .status(r.status)
        .type(r.headers.get("content-type") || "application/json")
        .send(text);
      return;
    }

    const json = JSON.parse(text) as any;
    const intentId =
      typeof json?.intent?.intentId === "string" ? json.intent.intentId : null;
    const cfOrderId =
      typeof json?.intent?.orderId === "string" ? json.intent.orderId : null;
    const paymentSessionId =
      typeof json?.intent?.paymentSessionId === "string"
        ? json.intent.paymentSessionId
        : null;

    if (!intentId) {
      res.status(502).json({ error: "PAYMENT_INTENT_BAD_RESPONSE" });
      return;
    }

    const metadata: Record<string, unknown> = { ...(order.metadata ?? {}) };
    if (cfOrderId) metadata.cashfreeOrderId = cfOrderId;
    if (paymentSessionId) metadata.cashfreePaymentSessionId = paymentSessionId;

    const updated = await orderRepo.updateById(order.id, {
      status: "PAYMENT_PENDING",
      paymentIntentId: intentId,
      metadata,
    });
    res.json({ order: updated ?? order, payment: json });
  }
);

export default router;
