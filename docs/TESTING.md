# Testing Guide

## Overview

Biome uses **Vitest** for unit and integration tests. Tests live alongside the source files they cover (e.g. `cache.test.ts` next to `cache.ts`).

## Running tests

```bash
# Run all tests once
pnpm test

# Watch mode
pnpm test --watch

# With coverage
pnpm test --coverage
```

## Existing tests

| File | What it covers |
|------|---------------|
| `server/services/cache.test.ts` | In-memory cache set/get/TTL/eviction |
| `server/services/llmClient.test.ts` | LLM client response parsing |

## Test structure conventions

Tests use **Vitest** with `describe` / `it` / `expect`. Keep tests next to the file they cover.

```ts
// server/services/myService.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { myService } from "./myService";

describe("myService", () => {
  it("does the thing", async () => {
    const result = await myService.doThing({ input: "foo" });
    expect(result).toMatchObject({ output: "bar" });
  });
});
```

## API route tests

For route-level tests, use **supertest** against an Express app instance (without starting a real server):

```ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import healthRouter from "../routes/health";

const app = express();
app.use("/api", healthRouter);

describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.uptime).toBe("number");
  });
});
```

## Auth route tests

Use a test JWT secret and sign tokens directly:

```ts
import jwt from "jsonwebtoken";

const TEST_SECRET = "test_secret";
process.env.JWT_SECRET = TEST_SECRET;

function makeToken(payload: object) {
  return jwt.sign(payload, TEST_SECRET, { expiresIn: "1h" });
}

// Then pass as cookie or header:
request(app)
  .get("/api/users/profile")
  .set("Cookie", `deepenk_token=${makeToken({ id: "user_1" })}`)
```

## Mocking external services

Use `vi.mock` for external dependencies:

```ts
import { vi } from "vitest";

vi.mock("../repositories", () => ({
  userRepo: {
    getById: vi.fn().mockResolvedValue({ id: "user_1", name: "Alice" }),
    upsertByEmail: vi.fn().mockResolvedValue({ id: "user_1", email: "a@b.com" }),
  },
  orderRepo: {
    create: vi.fn(),
    getById: vi.fn(),
    listByUser: vi.fn().mockResolvedValue([]),
    updateById: vi.fn(),
  },
}));
```

## Test coverage targets

| Domain | Priority | Notes |
|--------|----------|-------|
| Auth routes | High | OTP flow, JWT signing, cookie handling |
| Orders routes | High | Status transitions, payment intent creation |
| Search service | High | Domain routing, result deduplication |
| Health | Medium | Trivial but good smoke test |
| Rides routes | Medium | Geocode, route, fare estimate |
| Food routes | Medium | Search, menu, delivery options |
| Payments proxy | Medium | Header forwarding, body passthrough |
| AI routes | Low | Stub/mock LLM responses |
| Cache service | Done ✅ | Already covered |
| LLM client | Done ✅ | Already covered |

## Testing the SSE endpoint

Use `eventsource` or test the raw HTTP stream:

```ts
import { describe, it, expect } from "vitest";
import request from "supertest";

it("opens SSE stream with correct headers", async () => {
  const res = await request(app)
    .get("/api/sse/price-alerts")
    .set("Cookie", `deepenk_token=${makeToken({ id: "user_1" })}`)
    .buffer(false)
    .timeout({ response: 500 }); // just test headers

  expect(res.headers["content-type"]).toContain("text/event-stream");
});
```

## Payments microservice (Haskell)

The Haskell service has its own test suite in `payments-hs/`. Run with:

```bash
cd payments-hs
cabal test
```

## CI

Tests should run on every PR. Add this to your CI config:

```yaml
# .github/workflows/test.yml
- name: Install deps
  run: pnpm install
- name: Run tests
  run: pnpm test --run
```
