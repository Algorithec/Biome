import type { LatLng } from "./foodService";
import { createHash } from "node:crypto";

export type RideProvider = "Uber" | "Ola" | "Rapido" | "ONDC";
export type RideType = "bike" | "auto" | "cab" | "premium";

export type RideQuote = {
  id: string;
  provider: RideProvider;
  type: RideType;
  fare: number;
  etaMinutes: number;
  driverRating: number;
  distanceKm: number;
  surgeMultiplier?: number;
  deeplinkUrl: string;
};

function distanceKm(a: LatLng, b: LatLng) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function hashHex12(input: string) {
  return createHash("sha256").update(input).digest("hex").slice(0, 12);
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(input: string) {
  const hex = createHash("sha256").update(input).digest("hex").slice(0, 8);
  return Number.parseInt(hex, 16) >>> 0;
}

function getRapidApiKey() {
  return process.env.RAPIDAPI_KEY || process.env.RAPID_API_KEY || "";
}

function getRapidApiProviderConfig(provider: string) {
  const key = provider.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  const host = process.env[`RAPIDAPI_${key}_HOST`] || "";
  const url = process.env[`RAPIDAPI_${key}_FARE_URL`] || "";
  return { host, url };
}

function pickString(v: unknown, keys: string[]): string | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  for (const k of keys) {
    const val = o[k];
    if (typeof val === "string" && val.trim()) return val;
  }
  return undefined;
}

function pickNumber(v: unknown, keys: string[]): number | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  for (const k of keys) {
    const val = o[k];
    if (typeof val === "number" && Number.isFinite(val)) return val;
    if (typeof val === "string" && val.trim() && Number.isFinite(Number(val))) return Number(val);
  }
  return undefined;
}

function pickArray(v: unknown, keys: string[]): unknown[] | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  for (const k of keys) {
    const val = o[k];
    if (Array.isArray(val)) return val;
  }
  return undefined;
}

function normalizeRideType(v: string | undefined): RideType {
  if (!v) return "cab";
  const s = v.toLowerCase();
  if (s.includes("bike")) return "bike";
  if (s.includes("auto")) return "auto";
  if (s.includes("premium") || s.includes("lux")) return "premium";
  return "cab";
}

async function fetchJsonWithTimeout(url: string, headers: Record<string, string>, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, { headers, signal: controller.signal });
    if (!r.ok) throw new Error(`RAPIDAPI_HTTP_${r.status}`);
    return (await r.json()) as unknown;
  } finally {
    clearTimeout(t);
  }
}

async function rapidApiFareEstimateForProvider(input: {
  provider: RideProvider;
  pickup: LatLng;
  dropoff: LatLng;
  distanceKm: number;
}): Promise<RideQuote[] | null> {
  const apiKey = getRapidApiKey();
  if (!apiKey) return null;
  const cfg = getRapidApiProviderConfig(input.provider);
  if (!cfg.host || !cfg.url) return null;

  const rawUrl = cfg.url
    .replaceAll("{pickup_lat}", encodeURIComponent(String(input.pickup.lat)))
    .replaceAll("{pickup_lng}", encodeURIComponent(String(input.pickup.lng)))
    .replaceAll("{dropoff_lat}", encodeURIComponent(String(input.dropoff.lat)))
    .replaceAll("{dropoff_lng}", encodeURIComponent(String(input.dropoff.lng)));
  const u = new URL(rawUrl);
  if (!cfg.url.includes("{pickup_lat}") && !u.searchParams.has("pickup_lat")) u.searchParams.set("pickup_lat", String(input.pickup.lat));
  if (!cfg.url.includes("{pickup_lng}") && !u.searchParams.has("pickup_lng")) u.searchParams.set("pickup_lng", String(input.pickup.lng));
  if (!cfg.url.includes("{dropoff_lat}") && !u.searchParams.has("dropoff_lat")) u.searchParams.set("dropoff_lat", String(input.dropoff.lat));
  if (!cfg.url.includes("{dropoff_lng}") && !u.searchParams.has("dropoff_lng")) u.searchParams.set("dropoff_lng", String(input.dropoff.lng));

  const json = await fetchJsonWithTimeout(
    u.toString(),
    { "x-rapidapi-key": apiKey, "x-rapidapi-host": cfg.host },
    8000,
  ).catch(() => {
    throw new Error(`RAPIDAPI_${input.provider}_FARE_FAILED`);
  });

  const arr =
    (Array.isArray(json) ? json : undefined) ||
    pickArray(json, ["quotes", "data", "items", "results", "result", "response"]);

  const toQuote = (x: unknown): RideQuote | null => {
    const type = normalizeRideType(pickString(x, ["type", "ride_type", "vehicle_type", "vehicleType", "category"]));
    const fare = pickNumber(x, ["fare", "price", "amount", "estimated_fare", "estimatedFare"]);
    const eta = pickNumber(x, ["eta", "etaMinutes", "eta_minutes", "pickup_eta", "pickupEta"]);
    if (typeof fare !== "number") return null;
    const driverRating = clamp(pickNumber(x, ["driverRating", "rating", "driver_rating"]) ?? 4.5, 0, 5);
    const surgeMultiplier = pickNumber(x, ["surge", "surgeMultiplier", "surge_multiplier"]);
    const deeplinkUrl = pickString(x, ["deeplink", "deeplinkUrl", "url", "link"]) || "https://example.com/checkout";
    const externalId = pickString(x, ["id", "quote_id", "quoteId", "estimate_id", "estimateId"]);
    const stablePart =
      externalId ??
      hashHex12(
        [
          input.provider.toLowerCase(),
          type,
          String(Math.round(fare)),
          String(Math.round(eta ?? 10)),
          String(input.pickup.lat),
          String(input.pickup.lng),
          String(input.dropoff.lat),
          String(input.dropoff.lng),
        ].join("|"),
      );
    return {
      id: `rd_${input.provider.toLowerCase()}_${stablePart}`,
      provider: input.provider,
      type,
      fare: Math.round(fare),
      etaMinutes: clamp(Math.round(eta ?? 10), 1, 180),
      driverRating: Number(driverRating.toFixed(1)),
      distanceKm: input.distanceKm,
      surgeMultiplier: typeof surgeMultiplier === "number" && surgeMultiplier > 1 ? Number(surgeMultiplier.toFixed(2)) : undefined,
      deeplinkUrl,
    };
  };

  const out: RideQuote[] = [];
  if (arr) {
    for (const x of arr) {
      const q = toQuote(x);
      if (q) out.push(q);
    }
    return out.slice(0, 12);
  }

  const single = toQuote(json);
  return single ? [single] : [];
}

export class RidesService {
  async getFareEstimate(input: { pickup: LatLng; dropoff: LatLng }): Promise<{ quotes: RideQuote[] }> {
    const dist = Number(distanceKm(input.pickup, input.dropoff).toFixed(1));
    const baseEta = clamp(Math.round(5 + dist * 3), 4, 60);

    const providers: RideProvider[] = ["Uber", "Ola", "Rapido", "ONDC"];
    const types: RideType[] = ["bike", "auto", "cab", "premium"];

    const quotes: RideQuote[] = [];
    for (const provider of providers) {
      try {
        const real = await rapidApiFareEstimateForProvider({ provider, pickup: input.pickup, dropoff: input.dropoff, distanceKm: dist });
        if (real && real.length) {
          quotes.push(...real);
          continue;
        }
      } catch {
      }

      for (const type of types) {
        const rng = mulberry32(seedFrom([provider, type, String(input.pickup.lat), String(input.pickup.lng), String(input.dropoff.lat), String(input.dropoff.lng)].join("|")));
        const surge = rng() > 0.75 ? Number((1 + rng() * 0.6).toFixed(2)) : 1;
        const perKm =
          type === "bike" ? 10 : type === "auto" ? 14 : type === "cab" ? 18 : 28;
        const base = 35 + dist * perKm;
        const fare = Math.round(base * surge);

        quotes.push({
          id: `rd_${provider.toLowerCase()}_${hashHex12([provider.toLowerCase(), type, String(fare), String(input.pickup.lat), String(input.pickup.lng), String(input.dropoff.lat), String(input.dropoff.lng)].join("|"))}`,
          provider,
          type,
          fare,
          etaMinutes: clamp(baseEta + (type === "premium" ? -1 : type === "bike" ? 2 : 0) + Math.round(rng() * 4), 3, 75),
          driverRating: Number((4.4 + rng() * 0.6).toFixed(1)),
          distanceKm: dist,
          surgeMultiplier: surge > 1 ? surge : undefined,
          deeplinkUrl: "https://example.com/checkout",
        });
      }
    }

    quotes.sort((a, b) => a.fare - b.fare);
    return { quotes };
  }

  async getAvailable(input: { center: LatLng }) {
    return {
      center: input.center,
      availability: [
        { provider: "Uber" as const, available: true },
        { provider: "Ola" as const, available: true },
        { provider: "Rapido" as const, available: true },
        { provider: "ONDC" as const, available: true },
      ],
    };
  }

  async book(input: { quoteId: string }) {
    return {
      bookingId: `bk_${hashHex12(input.quoteId)}`,
      quoteId: input.quoteId,
      status: "CONFIRMED",
      deeplinkUrl: "https://example.com/checkout",
    };
  }
}

export const ridesService = new RidesService();
