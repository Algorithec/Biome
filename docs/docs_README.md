# Biome / Deepenk — Documentation

Welcome to the Biome documentation. Use the links below to navigate.

| Doc | Purpose |
|-----|---------|
| [Architecture](./ARCHITECTURE.md) | System design, service boundaries, data flow |
| [API Spec](./API_SPEC.md) | Full REST API reference for all endpoints |
| [Testing Guide](./TESTING.md) | How to run, write, and extend tests |
| [Environment Variables](./ENV.md) | All env vars with defaults and notes |

## Quick orientation

Biome is a **multi-domain commerce aggregator** (food, rides, ecommerce, travel, stays) with:
- A **React + Vite** frontend
- A **Node.js / TypeScript / Express** API gateway
- A **Haskell** payments microservice (Cashfree)

Auth uses JWT (cookie + bearer). Realtime price alerts are delivered via **SSE** (WebSocket dependency has been removed — see Architecture doc).

## Repository layout

```
/
├── client/          React + Vite frontend
├── server/          Express API gateway (TypeScript)
│   ├── routes/      One file per domain
│   ├── services/    Business logic
│   ├── repositories/Data access layer
│   ├── middleware/  Auth, rate-limit, request context
│   ├── dto/         Zod schemas
│   └── entities/    Domain types
├── payments-hs/     Haskell Cashfree microservice
├── docs/            ← you are here
└── shared/          Constants shared between client & server
```
