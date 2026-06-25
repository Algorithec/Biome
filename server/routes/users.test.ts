import { describe, it, expect, vi } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import jwt from "jsonwebtoken";

const TEST_SECRET = "test_secret_users";
process.env.JWT_SECRET = TEST_SECRET;

vi.mock("../repositories", () => ({
  userRepo: {
    getById: vi.fn().mockResolvedValue({
      id: "user_1",
      name: "Alice",
      email: "alice@example.com",
      phone: "+919876543210",
      preferences: { theme: "dark" },
    }),
    updateById: vi.fn().mockImplementation((_id: string, patch: object) =>
      Promise.resolve({
        id: "user_1",
        name: "Alice",
        email: "alice@example.com",
        phone: null,
        preferences: {},
        ...patch,
      })
    ),
  },
}));

import usersRouter from "./users";
import { attachRequestContext } from "../middleware/requestContext";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(attachRequestContext());
  app.use("/api/users", usersRouter);
  return app;
}

function authCookie(userId = "user_1") {
  const token = jwt.sign({ id: userId }, TEST_SECRET, { expiresIn: "1h" });
  return `deepenk_token=${token}`;
}

describe("GET /api/users/profile", () => {
  it("returns guest profile when not authenticated", async () => {
    const res = await request(makeApp()).get("/api/users/profile");

    expect(res.status).toBe(200);
    expect(res.body.id).toBeNull();
    expect(res.body.name).toBe("Guest");
    expect(res.body.tier).toBe("Free");
  });

  it("returns real user profile when authenticated", async () => {
    const res = await request(makeApp())
      .get("/api/users/profile")
      .set("Cookie", authCookie());

    expect(res.status).toBe(200);
    expect(res.body.id).toBe("user_1");
    expect(res.body.name).toBe("Alice");
    expect(res.body.email).toBe("alice@example.com");
  });

  it("includes tier and totalSavings fields", async () => {
    const res = await request(makeApp())
      .get("/api/users/profile")
      .set("Cookie", authCookie());

    expect(res.body.tier).toBe("Free");
    expect(res.body.totalSavings).toBe(0);
  });
});

describe("PUT /api/users/profile", () => {
  it("updates name for authenticated user", async () => {
    const res = await request(makeApp())
      .put("/api/users/profile")
      .set("Cookie", authCookie())
      .send({ name: "Alice Updated" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
  });

  it("returns 401 without auth", async () => {
    const res = await request(makeApp())
      .put("/api/users/profile")
      .send({ name: "Alice" });

    expect(res.status).toBe(401);
  });

  it("returns 400 when name is empty string", async () => {
    const res = await request(makeApp())
      .put("/api/users/profile")
      .set("Cookie", authCookie())
      .send({ name: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_BODY");
  });

  it("returns 400 when name exceeds 80 chars", async () => {
    const res = await request(makeApp())
      .put("/api/users/profile")
      .set("Cookie", authCookie())
      .send({ name: "A".repeat(81) });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_BODY");
  });

  it("returns 404 when user not found", async () => {
    const { userRepo } = await import("../repositories");
    vi.mocked(userRepo.updateById).mockResolvedValueOnce(null as any);

    const res = await request(makeApp())
      .put("/api/users/profile")
      .set("Cookie", authCookie())
      .send({ name: "Ghost" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("USER_NOT_FOUND");
  });
});

describe("PUT /api/users/preferences", () => {
  it("saves arbitrary preferences for authenticated user", async () => {
    const res = await request(makeApp())
      .put("/api/users/preferences")
      .set("Cookie", authCookie())
      .send({ theme: "dark", language: "en" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.preferences).toMatchObject({
      theme: "dark",
      language: "en",
    });
  });

  it("returns 401 without auth", async () => {
    const res = await request(makeApp())
      .put("/api/users/preferences")
      .send({ theme: "dark" });

    expect(res.status).toBe(401);
  });
});

describe("GET /api/users/rewards", () => {
  it("returns rewards structure (unauthenticated)", async () => {
    const res = await request(makeApp()).get("/api/users/rewards");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      totalCashback: 0,
      availableCashback: 0,
      pendingCashback: 0,
      tier: "Free",
    });
  });
});

describe("GET /api/users/purchases", () => {
  it("returns empty purchases list for authenticated user", async () => {
    const res = await request(makeApp())
      .get("/api/users/purchases")
      .set("Cookie", authCookie());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it("returns 401 without auth", async () => {
    const res = await request(makeApp()).get("/api/users/purchases");
    expect(res.status).toBe(401);
  });
});
