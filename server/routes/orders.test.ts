import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import jwt from "jsonwebtoken";

const TEST_SECRET = "test_secret_orders";
process.env.JWT_SECRET = TEST_SECRET;

vi.mock("../repositories", () => {
  const order = {
    id: "order_1",
    userId: "user_1",
    domain: "ecommerce",
    provider: "Amazon",
    title: "Apple iPhone 15",
    itemUrl: "https://amazon.in/iphone15",
    amount: { currency: "INR", amount: 74999 },
    status: "CREATED",
    paymentIntentId: null,
    metadata: {},
    createdAt: new Date().toISOString(),
  };
  return {
    orderRepo: {
      create: vi.fn().mockResolvedValue(order),
      getById: vi.fn().mockImplementation((id: string) =>
        id === "order_1" ? Promise.resolve(order) : Promise.resolve(null)
      ),
      listByUser: vi.fn().mockResolvedValue([order]),
      updateById: vi.fn().mockImplementation((_id: string, patch: object) =>
        Promise.resolve({ ...order, ...patch })
      ),
    },
    userRepo: {
      getById: vi.fn().mockResolvedValue({
        id: "user_1",
        phone: "+919876543210",
        email: "alice@example.com",
        name: "Alice",
      }),
    },
  };
});

const mockOrder = {
  id: "order_1",
  userId: "user_1",
  domain: "ecommerce",
  provider: "Amazon",
  title: "Apple iPhone 15",
  itemUrl: "https://amazon.in/iphone15",
  amount: { currency: "INR", amount: 74999 },
  status: "CREATED",
  paymentIntentId: null,
  metadata: {},
  createdAt: new Date().toISOString(),
};

import ordersRouter from "./orders";
import { attachRequestContext } from "../middleware/requestContext";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(attachRequestContext());
  app.use("/api/orders", ordersRouter);
  return app;
}

function authCookie(userId = "user_1") {
  const token = jwt.sign({ id: userId }, TEST_SECRET, { expiresIn: "1h" });
  return `deepenk_token=${token}`;
}

describe("POST /api/orders", () => {
  it("creates an order for authenticated user", async () => {
    const res = await request(makeApp())
      .post("/api/orders")
      .set("Cookie", authCookie())
      .send({
        domain: "ecommerce",
        provider: "Amazon",
        title: "Apple iPhone 15",
        itemUrl: "https://amazon.in/iphone15",
        amount: { currency: "INR", amount: 74999 },
      });

    expect(res.status).toBe(200);
    expect(res.body.order).toBeDefined();
    expect(res.body.order.status).toBe("CREATED");
  });

  it("returns 401 without auth", async () => {
    const res = await request(makeApp())
      .post("/api/orders")
      .send({
        domain: "ecommerce",
        provider: "Amazon",
        title: "Apple iPhone 15",
        itemUrl: "https://amazon.in/iphone15",
        amount: { currency: "INR", amount: 74999 },
      });

    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid domain", async () => {
    const res = await request(makeApp())
      .post("/api/orders")
      .set("Cookie", authCookie())
      .send({
        domain: "gambling",
        provider: "Amazon",
        title: "Test",
        itemUrl: "https://amazon.in/test",
        amount: { currency: "INR", amount: 1000 },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_BODY");
  });
});

describe("GET /api/orders", () => {
  it("lists orders for authenticated user", async () => {
    const res = await request(makeApp())
      .get("/api/orders")
      .set("Cookie", authCookie());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it("returns 401 without auth", async () => {
    const res = await request(makeApp()).get("/api/orders");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/orders/:orderId", () => {
  it("returns order for owner", async () => {
    const res = await request(makeApp())
      .get("/api/orders/order_1")
      .set("Cookie", authCookie());

    expect(res.status).toBe(200);
    expect(res.body.order.id).toBe("order_1");
  });

  it("returns 404 for non-existent order", async () => {
    const res = await request(makeApp())
      .get("/api/orders/nonexistent")
      .set("Cookie", authCookie());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("ORDER_NOT_FOUND");
  });
});

describe("POST /api/orders/:orderId/cancel", () => {
  it("cancels an order in CREATED status", async () => {
    const res = await request(makeApp())
      .post("/api/orders/order_1/cancel")
      .set("Cookie", authCookie());

    expect(res.status).toBe(200);
    expect(res.body.order).toBeDefined();
  });

  it("returns 409 when order is already CONFIRMED", async () => {
    const { orderRepo } = await import("../repositories");
    vi.mocked(orderRepo.getById).mockResolvedValueOnce({
      ...mockOrder,
      status: "CONFIRMED",
    } as any);

    const res = await request(makeApp())
      .post("/api/orders/order_1/cancel")
      .set("Cookie", authCookie());

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("ORDER_ALREADY_CONFIRMED");
  });
});
