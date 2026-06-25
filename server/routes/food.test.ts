import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("../services/foodService", () => {
  const searchResult = {
    restaurants: [
      {
        id: "rest_1",
        name: "Pizza Palace",
        rating: 4.3,
        provider: "Swiggy",
        deliveryTimeMinutes: 30,
      },
    ],
  };
  const menuResult = {
    restaurantId: "rest_1",
    categories: [
      {
        name: "Pizzas",
        items: [{ id: "item_1", name: "Margherita", price: 299 }],
      },
    ],
  };
  const deliveryResult = {
    restaurantId: "rest_1",
    options: [
      { provider: "Swiggy", estimatedMinutes: 30, fee: 40 },
      { provider: "Zomato", estimatedMinutes: 35, fee: 25 },
    ],
  };
  return {
    foodService: {
      search: vi.fn().mockResolvedValue(searchResult),
      getMenu: vi.fn().mockResolvedValue(menuResult),
      getDeliveryOptions: vi.fn().mockResolvedValue(deliveryResult),
    },
  };
});

import foodRouter from "./food";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/food", foodRouter);
  return app;
}

describe("POST /api/food/search", () => {
  it("returns restaurants for a valid request", async () => {
    const res = await request(makeApp())
      .post("/api/food/search")
      .send({ query: "pizza", center: { lat: 12.9716, lng: 77.5946 } });

    expect(res.status).toBe(200);
    expect(res.body.restaurants).toBeDefined();
    expect(res.body.restaurants.length).toBeGreaterThan(0);
  });

  it("accepts optional radiusKm and providers", async () => {
    const res = await request(makeApp())
      .post("/api/food/search")
      .send({
        query: "biryani",
        center: { lat: 12.9716, lng: 77.5946 },
        radiusKm: 10,
        providers: ["Swiggy", "Zomato"],
      });

    expect(res.status).toBe(200);
  });

  it("returns 400 when query is missing", async () => {
    const res = await request(makeApp())
      .post("/api/food/search")
      .send({ center: { lat: 12.9716, lng: 77.5946 } });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_BODY");
  });

  it("returns 400 when center is missing", async () => {
    const res = await request(makeApp())
      .post("/api/food/search")
      .send({ query: "pizza" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_BODY");
  });

  it("returns 400 when radiusKm exceeds max (25)", async () => {
    const res = await request(makeApp())
      .post("/api/food/search")
      .send({
        query: "pizza",
        center: { lat: 12.9716, lng: 77.5946 },
        radiusKm: 50,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_BODY");
  });

  it("returns 400 for unknown provider", async () => {
    const res = await request(makeApp())
      .post("/api/food/search")
      .send({
        query: "pizza",
        center: { lat: 12.9716, lng: 77.5946 },
        providers: ["UberEats"],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_BODY");
  });
});

describe("GET /api/food/restaurants/:restaurantId/menu", () => {
  it("returns menu for a valid restaurant ID", async () => {
    const res = await request(makeApp()).get(
      "/api/food/restaurants/rest_1/menu"
    );

    expect(res.status).toBe(200);
    expect(res.body.restaurantId).toBe("rest_1");
    expect(Array.isArray(res.body.categories)).toBe(true);
  });

  it("calls foodService.getMenu with the correct restaurant ID", async () => {
    const { foodService } = await import("../services/foodService");

    await request(makeApp()).get("/api/food/restaurants/rest_abc/menu");

    expect(vi.mocked(foodService.getMenu)).toHaveBeenCalledWith("rest_abc");
  });
});

describe("POST /api/food/delivery-options", () => {
  it("returns delivery options for a valid request", async () => {
    const res = await request(makeApp())
      .post("/api/food/delivery-options")
      .send({
        restaurantId: "rest_1",
        center: { lat: 12.9716, lng: 77.5946 },
      });

    expect(res.status).toBe(200);
    expect(res.body.options).toBeDefined();
    expect(res.body.options.length).toBeGreaterThan(0);
  });

  it("returns 400 when restaurantId is missing", async () => {
    const res = await request(makeApp())
      .post("/api/food/delivery-options")
      .send({ center: { lat: 12.9716, lng: 77.5946 } });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_BODY");
  });

  it("returns 400 when center is missing", async () => {
    const res = await request(makeApp())
      .post("/api/food/delivery-options")
      .send({ restaurantId: "rest_1" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_BODY");
  });
});
