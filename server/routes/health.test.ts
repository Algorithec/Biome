import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import healthRouter from "./health";

const app = express();
app.use("/api", healthRouter);

describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.uptime).toBe("number");
    expect(typeof res.body.timestamp).toBe("string");
  });

  it("timestamp is a valid ISO 8601 date", async () => {
    const res = await request(app).get("/api/health");
    const d = new Date(res.body.timestamp);
    expect(isNaN(d.getTime())).toBe(false);
  });
});
