import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";

// Mock repositories before importing the router
vi.mock("../repositories", () => ({
  userRepo: {
    upsertByEmail: vi.fn().mockResolvedValue({
      id: "user_1",
      email: "alice@example.com",
      name: "Alice",
      phone: null,
    }),
    upsertByPhone: vi.fn().mockResolvedValue({
      id: "user_2",
      phone: "+919876543210",
      email: null,
      name: null,
    }),
    getById: vi.fn().mockResolvedValue({
      id: "user_1",
      email: "alice@example.com",
      name: "Alice",
    }),
  },
}));

vi.mock("../services/otpService", () => ({
  otpService: {
    requestOtp: vi.fn().mockResolvedValue({
      requestId: "otp_req_1",
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      otp: "123456",
    }),
    resendOtp: vi.fn().mockResolvedValue({
      requestId: "otp_req_1",
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      otp: "123456",
      channel: "email",
      destination: "alice@example.com",
    }),
    verifyOtp: vi.fn().mockResolvedValue({
      channel: "email",
      destination: "alice@example.com",
    }),
  },
}));

vi.mock("../services/otpSenders", () => ({
  createEmailSender: () => ({ send: vi.fn().mockResolvedValue(undefined) }),
  createSmsSender: () => ({ send: vi.fn().mockResolvedValue(undefined) }),
  isEmailSenderConfigured: () => true,
  isSmsSenderConfigured: () => false,
}));

vi.mock("../services/googleOAuth", () => ({
  isGoogleConfigured: () => false,
  buildGoogleAuthUrl: vi.fn(),
  createGoogleAuthState: vi.fn(),
  exchangeCodeForProfile: vi.fn(),
}));

process.env.JWT_SECRET = "test_secret_for_auth_tests";

import authRouter from "./auth";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/auth", authRouter);
  return app;
}

describe("GET /auth/config", () => {
  it("returns auth method availability", async () => {
    const res = await request(makeApp()).get("/auth/config");
    expect(res.status).toBe(200);
    expect(typeof res.body.google).toBe("boolean");
    expect(typeof res.body.emailOtp).toBe("boolean");
    expect(typeof res.body.smsOtp).toBe("boolean");
  });
});

describe("POST /auth/login", () => {
  it("returns user and token for valid email", async () => {
    const res = await request(makeApp())
      .post("/auth/login")
      .send({ email: "alice@example.com", name: "Alice" });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe("string");
  });

  it("sets httpOnly cookie", async () => {
    const res = await request(makeApp())
      .post("/auth/login")
      .send({ email: "alice@example.com" });

    const cookies = res.headers["set-cookie"] as string[] | string;
    const cookieArr = Array.isArray(cookies) ? cookies : [cookies];
    const tokenCookie = cookieArr.find(c => c.startsWith("deepenk_token="));
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie).toContain("HttpOnly");
  });

  it("returns 400 for missing email", async () => {
    const res = await request(makeApp()).post("/auth/login").send({ name: "Alice" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_BODY");
  });
});

describe("POST /auth/otp/request", () => {
  it("returns requestId for valid email channel", async () => {
    const res = await request(makeApp())
      .post("/auth/otp/request")
      .send({ channel: "email", email: "alice@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.requestId).toBe("otp_req_1");
    expect(res.body.expiresAt).toBeDefined();
    // devOtp present in non-production
    expect(res.body.devOtp).toBe("123456");
  });

  it("returns 400 when channel is email but email is missing", async () => {
    const res = await request(makeApp())
      .post("/auth/otp/request")
      .send({ channel: "email" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("MISSING_DESTINATION");
  });

  it("returns 400 for unknown channel", async () => {
    const res = await request(makeApp())
      .post("/auth/otp/request")
      .send({ channel: "carrier_pigeon", email: "alice@example.com" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_BODY");
  });
});

describe("POST /auth/otp/verify", () => {
  it("returns user and token on successful verification", async () => {
    const res = await request(makeApp())
      .post("/auth/otp/verify")
      .send({ requestId: "otp_req_1", otp: "123456" });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.token).toBeDefined();
  });

  it("returns 400 for short OTP", async () => {
    const res = await request(makeApp())
      .post("/auth/otp/verify")
      .send({ requestId: "otp_req_1", otp: "12" });

    expect(res.status).toBe(400);
  });
});

describe("POST /auth/logout", () => {
  it("clears the token cookie and returns success", async () => {
    const res = await request(makeApp()).post("/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("GET /auth/me", () => {
  it("returns null user when not authenticated", async () => {
    const res = await request(makeApp()).get("/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });
});
