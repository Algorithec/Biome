import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import jwt from "jsonwebtoken";

const TEST_SECRET = "test_secret_payments";
process.env.JWT_SECRET = TEST_SECRET;
process.env.PAYMENTS_SERVICE_URL = "http://mock-payments:4010";

// Mock global fetch — payments routes are pure proxies
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import paymentsRouter from "./payments";
import { attachRequestContext } from "../middleware/requestContext";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(attachRequestContext());
  app.use("/api/payments", paymentsRouter);
  return app;
}

function authCookie(userId = "user_1") {
  const token = jwt.sign({ id: userId }, TEST_SECRET, { expiresIn: "1h" });
  return `deepenk_token=${token}`;
}

function mockUpstream(
  body: unknown,
  status = 200,
  contentType = "application/json"
) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (h: string) => (h === "content-type" ? contentType : null),
    },
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as any);
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("GET /api/payments/health", () => {
  it("proxies health response from payments service", async () => {
    mockUpstream({ status: "ok" });

    const res = await request(makeApp()).get("/api/payments/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("passes through non-200 status from payments service", async () => {
    mockUpstream({ error: "payments service down" }, 503);

    const res = await request(makeApp()).get("/api/payments/health");

    expect(res.status).toBe(503);
  });
});

describe("POST /api/payments/intents", () => {
  const validBody = {
    money: { amount: 499, currency: "INR" },
    customer: {
      customerId: "user_1",
      customerPhone: "+919876543210",
      customerEmail: "alice@example.com",
    },
    orderId: "ord_123",
  };

  it("creates a payment intent and proxies the response", async () => {
    mockUpstream({
      intent: {
        intentId: "pi_abc",
        orderId: "cf_ord_123",
        paymentSessionId: "sess_xyz",
      },
    });

    const res = await request(makeApp())
      .post("/api/payments/intents")
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.intent.intentId).toBe("pi_abc");
  });

  it("forwards Idempotency-Key header to upstream", async () => {
    mockUpstream({ intent: { intentId: "pi_abc" } });

    await request(makeApp())
      .post("/api/payments/intents")
      .set("Idempotency-Key", "idem_key_123")
      .send(validBody);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["Idempotency-Key"]).toBe("idem_key_123");
  });

  it("forwards x-user-id header when authenticated", async () => {
    mockUpstream({ intent: { intentId: "pi_abc" } });

    await request(makeApp())
      .post("/api/payments/intents")
      .set("Cookie", authCookie("user_1"))
      .send(validBody);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["x-user-id"]).toBe("user_1");
  });

  it("does not set x-user-id when unauthenticated", async () => {
    mockUpstream({ intent: { intentId: "pi_abc" } });

    await request(makeApp()).post("/api/payments/intents").send(validBody);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["x-user-id"]).toBeUndefined();
  });

  it("returns 400 for missing money field", async () => {
    const res = await request(makeApp())
      .post("/api/payments/intents")
      .send({
        customer: { customerId: "u1", customerPhone: "+91..." },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_BODY");
  });

  it("returns 400 for missing customer field", async () => {
    const res = await request(makeApp())
      .post("/api/payments/intents")
      .send({ money: { amount: 499, currency: "INR" } });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_BODY");
  });

  it("returns 400 for negative amount", async () => {
    const res = await request(makeApp())
      .post("/api/payments/intents")
      .send({
        money: { amount: -100, currency: "INR" },
        customer: { customerId: "u1", customerPhone: "+91..." },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_BODY");
  });

  it("returns 400 for invalid customerEmail", async () => {
    const res = await request(makeApp())
      .post("/api/payments/intents")
      .send({
        money: { amount: 499, currency: "INR" },
        customer: {
          customerId: "u1",
          customerPhone: "+91...",
          customerEmail: "not-an-email",
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_BODY");
  });
});

describe("GET /api/payments/intents/:intentId", () => {
  it("fetches a payment intent by ID", async () => {
    mockUpstream({
      intent: { intentId: "pi_abc", status: "PENDING" },
    });

    const res = await request(makeApp()).get("/api/payments/intents/pi_abc");

    expect(res.status).toBe(200);
    expect(res.body.intent.intentId).toBe("pi_abc");
  });

  it("calls upstream with encoded intent ID", async () => {
    mockUpstream({ intent: {} });

    await request(makeApp()).get("/api/payments/intents/pi%2Fabc");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("pi%2Fabc");
  });

  it("passes through 404 from upstream", async () => {
    mockUpstream({ error: "NOT_FOUND" }, 404);

    const res = await request(makeApp()).get(
      "/api/payments/intents/nonexistent"
    );

    expect(res.status).toBe(404);
  });
});

describe("POST /api/payments/webhooks/cashfree", () => {
  const webhookHeaders = {
    "x-webhook-timestamp": "1234567890",
    "x-webhook-signature": "sig_abc",
    "x-webhook-version": "2023-08-01",
  };

  it("forwards webhook to upstream and returns its response", async () => {
    mockUpstream({ received: true });

    const res = await request(makeApp())
      .post("/api/payments/webhooks/cashfree")
      .set(webhookHeaders)
      .send({ event: "PAYMENT_SUCCESS", data: {} });

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  it("forwards cashfree signature headers to upstream", async () => {
    mockUpstream({ received: true });

    await request(makeApp())
      .post("/api/payments/webhooks/cashfree")
      .set(webhookHeaders)
      .send({ event: "PAYMENT_SUCCESS" });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["x-webhook-timestamp"]).toBe("1234567890");
    expect(options.headers["x-webhook-signature"]).toBe("sig_abc");
    expect(options.headers["x-webhook-version"]).toBe("2023-08-01");
  });

  it("passes through non-200 status from upstream", async () => {
    mockUpstream({ error: "INVALID_SIGNATURE" }, 400);

    const res = await request(makeApp())
      .post("/api/payments/webhooks/cashfree")
      .set(webhookHeaders)
      .send({ event: "PAYMENT_SUCCESS" });

    expect(res.status).toBe(400);
  });
});
