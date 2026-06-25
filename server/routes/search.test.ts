import { describe, it, expect, vi } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";

vi.mock("../services/searchEngine", () => {
  const result = {
    searchId: "srch_1",
    query: "iPhone",
    domain: "ecommerce",
    items: [
      {
        id: "item_1",
        name: "Apple iPhone 15",
        finalPrice: { amount: 74999, currency: "INR" },
        provider: "Amazon",
        rating: 4.5,
      },
    ],
  };
  return {
    searchEngine: {
      search: vi.fn().mockResolvedValue(result),
      suggestions: vi.fn().mockResolvedValue(["iPhone 15", "iPhone 14"]),
    },
  };
});

vi.mock("../repositories", () => ({
  clickRepo: {
    create: vi.fn().mockResolvedValue({ id: "click_1" }),
    listByUser: vi.fn().mockResolvedValue([]),
  },
  searchRepo: {
    listByUser: vi.fn().mockResolvedValue([]),
  },
}));

import searchRouter from "./search";
import { attachRequestContext } from "../middleware/requestContext";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(attachRequestContext());
  app.use("/api/search", searchRouter);
  return app;
}

describe("POST /api/search", () => {
  it("returns search results for a valid query", async () => {
    const res = await request(makeApp())
      .post("/api/search")
      .send({ query: "iPhone" });

    expect(res.status).toBe(200);
    expect(res.body.searchId).toBeDefined();
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it("returns 400 for empty query", async () => {
    const res = await request(makeApp())
      .post("/api/search")
      .send({ query: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_BODY");
  });

  it("returns 400 for missing body", async () => {
    const res = await request(makeApp()).post("/api/search").send({});
    expect(res.status).toBe(400);
  });
});

describe("POST /api/search/shopping", () => {
  it("routes to ecommerce domain", async () => {
    const { searchEngine } = await import("../services/searchEngine");
    const res = await request(makeApp())
      .post("/api/search/shopping")
      .send({ query: "laptop" });

    expect(res.status).toBe(200);
    expect(vi.mocked(searchEngine.search)).toHaveBeenCalledWith(
      expect.objectContaining({ domain: "ecommerce", query: "laptop" })
    );
  });
});

describe("POST /api/search/food", () => {
  it("routes to food domain", async () => {
    const { searchEngine } = await import("../services/searchEngine");
    const res = await request(makeApp())
      .post("/api/search/food")
      .send({ query: "pizza" });

    expect(res.status).toBe(200);
    expect(vi.mocked(searchEngine.search)).toHaveBeenCalledWith(
      expect.objectContaining({ domain: "food" })
    );
  });
});

describe("GET /api/search/suggestions", () => {
  it("returns suggestions for a query", async () => {
    const res = await request(makeApp())
      .get("/api/search/suggestions")
      .query({ q: "iph" });

    expect(res.status).toBe(200);
    expect(res.body.q).toBe("iph");
    expect(Array.isArray(res.body.suggestions)).toBe(true);
  });

  it("returns 400 for missing q param", async () => {
    const res = await request(makeApp()).get("/api/search/suggestions");
    expect(res.status).toBe(400);
  });
});

describe("POST /api/search/track-click", () => {
  it("records a click", async () => {
    const res = await request(makeApp())
      .post("/api/search/track-click")
      .send({
        searchId: "srch_1",
        itemName: "Apple iPhone 15",
        itemUrl: "https://amazon.in/iphone15",
        provider: "Amazon",
        price: 74999,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
