# Architecture

## Overview

Biome is a **multi-domain commerce aggregator** that lets users search, compare, and purchase across food delivery, ride-hailing, ecommerce, travel, and hospitality — from a single interface.

```
┌──────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
│              React + Vite  (port 3001 in dev)                │
│  /home  /food  /rides  /history  /profile  /dashboard        │
└────────────────────────┬─────────────────────────────────────┘
                         │ REST  (fetch / axios)
                         │ SSE   (price alerts)
                         ▼
┌──────────────────────────────────────────────────────────────┐
│               API Gateway — Express / TypeScript             │
│                        (port 3000)                           │
│                                                              │
│  /auth/*        OTP, Google OAuth, JWT                       │
│  /api/search/*  Universal search engine                      │
│  /api/food/*    Restaurant search, menu, delivery options    │
│  /api/rides/*   Geocode, routing, fare estimate, booking     │
│  /api/orders/*  Order lifecycle                              │
│  /api/payments/ Proxy → Haskell microservice                 │
│  /api/ai/*      Recommendations, price prediction            │
│  /api/users/*   Profile, preferences, rewards                │
│  /api/ondc/*    ONDC protocol integration                    │
│  /api/ecommerce/* Product search & detail                    │
│  /api/health    Liveness probe                               │
└───────────┬───────────────────────────┬──────────────────────┘
            │                           │
            ▼                           ▼
┌───────────────────┐       ┌───────────────────────┐
│  MongoDB / In-mem │       │  Haskell Payments svc  │
│  (users, orders,  │       │  (Cashfree, port 4010) │
│   searches, OTPs) │       │                        │
└───────────────────┘       └───────────────────────┘
```

## Realtime — SSE (replacing WebSocket)

The previous Socket.IO / WebSocket dependency has been **removed**. Realtime price alerts are now delivered over **Server-Sent Events (SSE)**.

### Why SSE over WebSocket?

| | WebSocket | SSE |
|---|---|---|
| Direction | Bi-directional | Server → client only |
| Protocol | Upgrade handshake | Plain HTTP |
| Proxy/CDN friendly | Sometimes | Yes |
| Reconnect built-in | Manual | Automatic |
| Use case fit | Chat, gaming | Alerts, feeds, progress |

Price alerts are purely server-push: the server detects a price drop and notifies the client. SSE is a better fit, simpler to operate, and works through all standard HTTP infrastructure.

### SSE endpoint (planned)

```
GET /api/sse/price-alerts
Authorization: Bearer <token>   (or cookie)
Accept: text/event-stream

← event: price-alert
   data: {"alertId":"...","itemId":"...","newPrice":1999,"platform":"Amazon"}

← event: ping
   data: {}
```

The backend runs a 60-second interval check (`priceService.checkPriceAlerts()`) and fans out events to all connected SSE clients. The old `socket.ts` file and Socket.IO dependency will be removed.

## Service boundaries

### API Gateway (Node/TypeScript)

Owns all inbound HTTP, auth, rate limiting, request validation, and orchestration. Does **not** own payment processing directly — proxies to the Haskell service.

### Payments microservice (Haskell)

- Wraps Cashfree APIs (`/v1/payment_intents`, `/v1/webhooks/cashfree`)
- Runs a background reconciliation loop to resolve open intents
- Webhook signature verification happens here
- Gateway proxies to it and maps idempotency keys

### Frontend

- Pure client — no server rendering
- Communicates only with the gateway via `/api/*` and `/auth/*`
- Dev proxy (Vite) forwards those prefixes to `localhost:3000`

## Data layer

The repositories layer (`server/repositories/`) abstracts storage. Currently supports **MongoDB** (preferred) and an **in-memory fallback** for zero-config dev. Collections:

| Collection | Purpose |
|------------|---------|
| `users` | Identity, email/phone, preferences |
| `otps` | One-time passwords with TTL |
| `orders` | Cross-domain order records |
| `searches` | Search history |
| `clicks` | Click-through tracking |
| `priceAlerts` | User-configured price thresholds |

## Auth flow

```
OTP flow
  client → POST /auth/otp/request  { channel, email|phone }
         ← { requestId, expiresAt }
  client → POST /auth/otp/verify   { requestId, otp }
         ← sets httpOnly cookie  deepenk_token  (JWT, 7 days)
         ← { user, token }

Google OAuth flow
  client → GET /auth/google
         ← 302 → accounts.google.com
  Google → GET /auth/google/callback?code=&state=
         ← 302 → /profile  (sets deepenk_token cookie)
```

JWT payload: `{ id, email?, phone?, name?, iat, exp }`

## Search engine

`searchEngine.search()` in `server/services/searchEngine.ts` is the central aggregation point. It:
1. Accepts a `query`, `domain`, optional `filters`, and optional `userId`
2. Fans out to domain-specific product/service providers
3. Ranks and deduplicates results
4. Persists the search to history (if user is authenticated)
5. Returns a unified `SearchResult` shape

Domains: `ecommerce` | `food` | `rides` | `travel` | `hospitality`

## Dependency map

```
server/index.ts
  └── routes/api.ts
        ├── routes/search.ts     ← services/searchEngine.ts
        ├── routes/food.ts       ← services/foodService.ts
        ├── routes/rides.ts      ← (OSM / OSRM external APIs)
        ├── routes/orders.ts     ← repositories/orderRepo, Haskell proxy
        ├── routes/payments.ts   ← Haskell proxy
        ├── routes/ai.ts         ← services/aiService.ts, llmClient.ts
        ├── routes/users.ts      ← repositories/userRepo
        ├── routes/products.ts   ← services/productService.ts
        ├── routes/ecommerce.ts  ← services/productService.ts
        ├── routes/price.ts      ← services/priceService.ts
        ├── routes/ondc.ts       ← ONDC protocol
        ├── routes/notifications.ts
        ├── routes/scrape.ts     ← services/cache.ts
        └── routes/health.ts
  └── routes/auth.ts             ← services/otpService.ts, googleOAuth.ts
  └── realtime/socket.ts         ← [BEING REPLACED with SSE]
```

## External dependencies

| External | Used for |
|----------|---------|
| OpenStreetMap tile servers | Map tiles (proxied via `/api/rides/tiles/:z/:x/:y.png`) |
| Nominatim | Geocoding and reverse geocoding |
| OSRM (project-osrm.org) | Route calculation |
| Cashfree | Payment processing (via Haskell service) |
| SendGrid | OTP email delivery |
| Twilio | OTP SMS delivery |
| Google OAuth | Social login |
| Google Maps (frontend) | Frontend map display (optional) |

## Error conventions

All API errors return JSON:
```json
{ "error": "ERROR_CODE", "details": { ... } }
```

Common codes: `INVALID_BODY`, `INVALID_QUERY`, `UNAUTHORIZED`, `NOT_FOUND`, `ORDER_NOT_FOUND`, `ORDER_CANCELLED`, `ORDER_ALREADY_CONFIRMED`, `MISSING_CUSTOMER_PHONE`.

HTTP status codes follow standard semantics: 400 validation, 401 auth, 404 not found, 409 conflict, 502 upstream failure.
