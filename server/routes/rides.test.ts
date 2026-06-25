import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// Mock global fetch so no real network calls are made
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("../services/ridesService", () => ({
  ridesService: {
    getFareEstimate: vi.fn().mockResolvedValue({
      quotes: [
        {
          provider: "Ola",
          category: "Mini",
          estimatedFare: 120,
          quoteId: "q_1",
        },
        {
          provider: "Uber",
          category: "Go",
          estimatedFare: 135,
          quoteId: "q_2",
        },
      ],
    }),
    getAvailable: vi.fn().mockResolvedValue({
      vehicles: [
        { provider: "Ola", category: "Mini", etaMinutes: 3 },
        { provider: "Rapido", category: "Bike", etaMinutes: 2 },
      ],
    }),
    book: vi.fn().mockResolvedValue({
      bookingId: "booking_1",
      status: "CONFIRMED",
      provider: "Ola",
    }),
  },
}));

import ridesRouter from "./rides";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/rides", ridesRouter);
  return app;
}

function mockJsonFetch(data: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    arrayBuffer: async () => new ArrayBuffer(0),
    headers: { get: () => null },
  } as any);
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("GET /api/rides/geocode", () => {
  it("returns geocode results for a valid query", async () => {
    mockJsonFetch([
      {
        place_id: "123",
        display_name: "Bengaluru",
        lat: "12.97",
        lon: "77.59",
      },
    ]);

    const res = await request(makeApp())
      .get("/api/rides/geocode")
      .query({ q: "Bengaluru" });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it("returns 400 when q is too short (< 2 chars)", async () => {
    const res = await request(makeApp())
      .get("/api/rides/geocode")
      .query({ q: "B" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_QUERY");
  });

  it("returns 400 when q is missing", async () => {
    const res = await request(makeApp()).get("/api/rides/geocode");
    expect(res.status).toBe(400);
  });

  it("returns 502 when upstream geocode fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network error"));

    const res = await request(makeApp())
      .get("/api/rides/geocode")
      .query({ q: "Bengaluru" });

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("GEOCODE_FAILED");
  });
});

describe("GET /api/rides/reverse", () => {
  it("returns reverse geocode result for valid coords", async () => {
    mockJsonFetch({ display_name: "Bengaluru, Karnataka", address: {} });

    const res = await request(makeApp())
      .get("/api/rides/reverse")
      .query({ lat: "12.9716", lng: "77.5946" });

    expect(res.status).toBe(200);
    expect(res.body.display_name).toBeDefined();
  });

  it("returns 400 when lat is missing", async () => {
    const res = await request(makeApp())
      .get("/api/rides/reverse")
      .query({ lng: "77.5946" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_QUERY");
  });

  it("returns 502 when upstream reverse geocode fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("timeout"));

    const res = await request(makeApp())
      .get("/api/rides/reverse")
      .query({ lat: "12.9716", lng: "77.5946" });

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("REVERSE_GEOCODE_FAILED");
  });
});

describe("GET /api/rides/route", () => {
  it("returns route geometry for valid coords", async () => {
    mockJsonFetch({
      routes: [
        {
          geometry: {
            type: "LineString",
            coordinates: [
              [77.59, 12.97],
              [77.62, 12.93],
            ],
          },
          distance: 4200,
          duration: 780,
        },
      ],
    });

    const res = await request(makeApp()).get("/api/rides/route").query({
      pickupLat: "12.9716",
      pickupLng: "77.5946",
      dropoffLat: "12.9352",
      dropoffLng: "77.6245",
    });

    expect(res.status).toBe(200);
    expect(res.body.geometry).toBeDefined();
    expect(res.body.distanceMeters).toBe(4200);
    expect(res.body.durationSeconds).toBe(780);
  });

  it("returns 400 when any coord param is missing", async () => {
    const res = await request(makeApp()).get("/api/rides/route").query({
      pickupLat: "12.9716",
      pickupLng: "77.5946",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_QUERY");
  });

  it("returns 502 when upstream returns no geometry", async () => {
    mockJsonFetch({ routes: [] });

    const res = await request(makeApp()).get("/api/rides/route").query({
      pickupLat: "12.9716",
      pickupLng: "77.5946",
      dropoffLat: "12.9352",
      dropoffLng: "77.6245",
    });

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("ROUTE_BAD_RESPONSE");
  });

  it("returns 502 when upstream fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("timeout"));

    const res = await request(makeApp()).get("/api/rides/route").query({
      pickupLat: "12.9716",
      pickupLng: "77.5946",
      dropoffLat: "12.9352",
      dropoffLng: "77.6245",
    });

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("ROUTE_FAILED");
  });
});

describe("POST /api/rides/fare-estimate", () => {
  it("returns fare quotes for valid pickup and dropoff", async () => {
    const res = await request(makeApp())
      .post("/api/rides/fare-estimate")
      .send({
        pickup: { lat: 12.9716, lng: 77.5946 },
        dropoff: { lat: 12.9352, lng: 77.6245 },
      });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.quotes)).toBe(true);
    expect(res.body.quotes.length).toBeGreaterThan(0);
  });

  it("returns 400 when pickup is missing", async () => {
    const res = await request(makeApp())
      .post("/api/rides/fare-estimate")
      .send({ dropoff: { lat: 12.9352, lng: 77.6245 } });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_BODY");
  });

  it("returns 400 when dropoff is missing", async () => {
    const res = await request(makeApp())
      .post("/api/rides/fare-estimate")
      .send({ pickup: { lat: 12.9716, lng: 77.5946 } });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_BODY");
  });
});

describe("GET /api/rides/available", () => {
  it("returns available vehicles for valid coords", async () => {
    const res = await request(makeApp())
      .get("/api/rides/available")
      .query({ lat: "12.9716", lng: "77.5946" });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.vehicles)).toBe(true);
  });

  it("returns 400 when lat is missing", async () => {
    const res = await request(makeApp())
      .get("/api/rides/available")
      .query({ lng: "77.5946" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_QUERY");
  });
});

describe("POST /api/rides/book", () => {
  it("books a ride for a valid quoteId", async () => {
    const res = await request(makeApp())
      .post("/api/rides/book")
      .send({ quoteId: "q_1" });

    expect(res.status).toBe(200);
    expect(res.body.bookingId).toBeDefined();
    expect(res.body.status).toBe("CONFIRMED");
  });

  it("returns 400 when quoteId is missing", async () => {
    const res = await request(makeApp()).post("/api/rides/book").send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_BODY");
  });

  it("returns 400 when quoteId is empty string", async () => {
    const res = await request(makeApp())
      .post("/api/rides/book")
      .send({ quoteId: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_BODY");
  });
});
