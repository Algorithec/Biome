import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { DomainSchema } from "../dto/search";
import { aiService } from "../services/aiService";
import { productService } from "../services/productService";

const router = Router();

router.post("/recommendations", async (req: Request, res: Response) => {
  const parsed = z
    .object({
      query: z.string().trim().min(1),
      domain: DomainSchema.optional(),
      preferences: z.record(z.string(), z.unknown()).optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_BODY", details: parsed.error.flatten() });
    return;
  }

  const domain = parsed.data.domain ?? "ecommerce";
  const providerResults = await productService.searchAcrossProviders({
    query: parsed.data.query,
    domain,
    filters: parsed.data.preferences,
  });
  const items = providerResults.flatMap((r) => r.items);
  const ai = await aiService.generateRecommendation(parsed.data.query, items);

  res.json(ai);
});

router.get("/price-prediction", async (req: Request, res: Response) => {
  const parsed = z
    .object({
      productId: z.string().trim().min(1),
      platform: z.string().trim().min(1),
    })
    .safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_QUERY", details: parsed.error.flatten() });
    return;
  }

  res.json({
    productId: parsed.data.productId,
    platform: parsed.data.platform,
    predictedPrice: 59999,
    confidence: 0.85,
    recommendation: "Wait 3-5 days for potential price drop",
  });
});

router.get("/review-summary", async (req: Request, res: Response) => {
  const parsed = z
    .object({
      itemId: z.string().trim().min(1),
      domain: DomainSchema.optional(),
    })
    .safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_QUERY", details: parsed.error.flatten() });
    return;
  }

  res.json({
    itemId: parsed.data.itemId,
    domain: parsed.data.domain ?? "ecommerce",
    pros: ["Good value", "Strong ratings"],
    cons: ["Limited stock sometimes"],
    verdict: "Recommended for most users at this price point",
  });
});

export default router;

