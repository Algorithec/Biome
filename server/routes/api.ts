import { Router, type Request, type Response } from "express";
import searchRouter from "./search";
import productsRouter from "./products";
import aiRouter from "./ai";
import priceRouter from "./price";
import usersRouter from "./users";
import notificationsRouter from "./notifications";
import ondcRouter from "./ondc";
import healthRouter from "./health";
import scrapeRouter from "./scrape";
import foodRouter from "./food";
import ecommerceRouter from "./ecommerce";
import ridesRouter from "./rides";
import { searchEngine } from "../services/searchEngine";

const router = Router();

router.use("/search", searchRouter);
router.use("/products", productsRouter);
router.use("/ai", aiRouter);
router.use("/", priceRouter);
router.use("/users", usersRouter);
router.use("/", notificationsRouter);
router.use("/", scrapeRouter);
router.use("/ondc", ondcRouter);
router.use("/", healthRouter);
router.use("/food", foodRouter);
router.use("/ecommerce", ecommerceRouter);
router.use("/rides", ridesRouter);

router.post("/ecommerce/search", async (req: Request, res: Response) => {
  const query = typeof req.body?.query === "string" ? req.body.query : "";
  const result = await searchEngine.search({ query, domain: "ecommerce" });
  res.json({
    query,
    results: result.items.map((i) => ({
      id: i.id,
      name: i.name,
      price: i.finalPrice.amount,
      platform: i.provider,
      rating: i.rating,
    })),
  });
});

export default router;
