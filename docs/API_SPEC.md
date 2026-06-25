# API Specification

Base URL (production): `https://<your-domain>`  
Base URL (dev gateway): `http://localhost:3000`

All request bodies are `application/json`. All responses are `application/json` unless noted.

Auth is via an `httpOnly` cookie `deepenk_token` (set on login) **or** an `Authorization: Bearer <token>` header.

---

## Auth — `/auth`

### `GET /auth/config`
Returns which auth methods are configured.

**Response**
```json
{
  "google": true,
  "emailOtp": true,
  "smsOtp": false
}
```

---

### `GET /auth/google`
Redirects the browser to Google's OAuth consent screen. Sets a `deepenk_google_state` cookie for CSRF protection.

**Redirect** → `accounts.google.com`

---

### `GET /auth/google/callback`
OAuth callback. Validates state, exchanges code for a Google profile, upserts the user, sets `deepenk_token` cookie.

| Query param | Type | Required |
|-------------|------|----------|
| `code` | string | ✅ |
| `state` | string | ✅ |

**Redirect** → `<FRONTEND_URL>/profile`

**Error redirects** → `<FRONTEND_URL>/auth?error=google_not_configured`

---

### `POST /auth/login`
Direct email login (no OTP, dev-friendly).

**Body**
```json
{
  "email": "user@example.com",
  "name": "Alice"
}
```

**Response**
```json
{
  "user": { "id": "...", "email": "user@example.com", "name": "Alice" },
  "token": "<jwt>"
}
```
Also sets `deepenk_token` cookie.

---

### `POST /auth/otp/request`
Request an OTP to be sent via email or SMS.

**Body**
```json
{
  "channel": "email",
  "email": "user@example.com"
}
```
or
```json
{
  "channel": "phone",
  "phone": "+919876543210"
}
```

**Response**
```json
{
  "requestId": "otp_abc123",
  "expiresAt": "2024-01-01T12:05:00.000Z",
  "devOtp": "123456"
}
```
`devOtp` is only present in non-production environments.

**Errors**

| Code | Status | Meaning |
|------|--------|---------|
| `MISSING_DESTINATION` | 400 | email/phone missing for the chosen channel |
| `EMAIL_SENDER_NOT_CONFIGURED` | 501 | SendGrid env vars missing (prod) |
| `SMS_SENDER_NOT_CONFIGURED` | 501 | Twilio env vars missing (prod) |

---

### `POST /auth/otp/resend`
Resend an existing OTP request.

**Body**
```json
{ "requestId": "otp_abc123" }
```

**Response** — same shape as `/auth/otp/request`

---

### `POST /auth/otp/verify`
Verify an OTP and receive a JWT.

**Body**
```json
{
  "requestId": "otp_abc123",
  "otp": "123456"
}
```

**Response**
```json
{
  "user": { "id": "...", "email": "user@example.com" },
  "token": "<jwt>"
}
```
Also sets `deepenk_token` cookie.

**Errors** — 400 with OTP-specific error message string.

---

### `POST /auth/logout`
Clears the `deepenk_token` cookie.

**Response** `{ "success": true }`

---

### `GET /auth/me`
Returns the current user if authenticated, or `{ "user": null }` if not.

**Auth** optional

**Response**
```json
{
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "Alice",
    "phone": null
  }
}
```

---

### `GET /auth/me/required`
Same as `/auth/me` but returns `401` if not authenticated.

**Auth** required

---

## Health — `/api/health`

### `GET /api/health`
Liveness check.

**Response**
```json
{
  "status": "ok",
  "uptime": 123.4,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

---

## Search — `/api/search`

All search endpoints accept the same body shape:

```json
{
  "query": "iPhone 15",
  "domain": "ecommerce",
  "filters": {
    "maxPrice": 80000,
    "minRating": 4.0
  },
  "locale": "en-IN"
}
```

`domain` is optional on `POST /api/search` (defaults to `ecommerce`).

**Auth** optional on all search routes (saves history when authenticated).

### `POST /api/search`
Universal search across all domains.

### `POST /api/search/shopping`
Scoped to `ecommerce` domain.

### `POST /api/search/food`
Scoped to `food` domain.

### `POST /api/search/rides`
Scoped to `rides` domain.

### `POST /api/search/travel`
Scoped to `travel` domain.

### `POST /api/search/stays`
Scoped to `hospitality` domain.

**Response** (all search endpoints)
```json
{
  "searchId": "srch_xyz",
  "query": "iPhone 15",
  "domain": "ecommerce",
  "items": [
    {
      "id": "...",
      "name": "Apple iPhone 15 128GB",
      "finalPrice": { "amount": 74999, "currency": "INR" },
      "originalPrice": { "amount": 79999, "currency": "INR" },
      "provider": "Amazon",
      "rating": 4.5,
      "imageUrl": "https://...",
      "itemUrl": "https://..."
    }
  ]
}
```

---

### `GET /api/search/suggestions`
Autocomplete suggestions.

| Query param | Type | Required |
|-------------|------|----------|
| `q` | string | ✅ |
| `domain` | DomainEnum | ❌ |

**Response**
```json
{
  "q": "iph",
  "suggestions": ["iPhone 15", "iPhone 14", "iPhone case"]
}
```

---

### `POST /api/search/track-click`
Records a user click on a search result.

**Auth** optional

**Body**
```json
{
  "searchId": "srch_xyz",
  "itemName": "Apple iPhone 15",
  "itemUrl": "https://amazon.in/...",
  "provider": "Amazon",
  "price": 74999
}
```

**Response** `{ "success": true, "click": { ... } }`

---

### `GET /api/search/history`
Returns the authenticated user's past searches.

**Auth** required

| Query param | Type | Default |
|-------------|------|---------|
| `limit` | number (1-100) | 20 |

**Response** `{ "items": [ ... ] }`

---

## Food — `/api/food`

### `POST /api/food/search`
Search for restaurants near a location.

**Body**
```json
{
  "query": "pizza",
  "center": { "lat": 12.9716, "lng": 77.5946 },
  "radiusKm": 5,
  "providers": ["Swiggy", "Zomato"]
}
```
`radiusKm` defaults to 5, max 25. `providers` defaults to all.

**Response** — aggregated restaurant list from requested providers.

---

### `GET /api/food/restaurants/:restaurantId/menu`
Fetch a restaurant's menu.

| Path param | Type | Required |
|------------|------|----------|
| `restaurantId` | string | ✅ |

**Response** — restaurant menu with categories and items.

---

### `POST /api/food/delivery-options`
Get delivery options for a restaurant to a location.

**Body**
```json
{
  "restaurantId": "rest_abc",
  "center": { "lat": 12.9716, "lng": 77.5946 }
}
```

**Response** — available delivery slots, estimated time, delivery fee per provider.

---

## Rides — `/api/rides`

### `GET /api/rides/tiles/:z/:x/:y.png`
Proxy for OpenStreetMap tiles (avoids CORS in browser). Falls back to CartoCDN.

**Response** — `image/png`

---

### `GET /api/rides/geocode`
Forward geocoding (address → coordinates).

| Query param | Type | Required |
|-------------|------|----------|
| `q` | string (2-200 chars) | ✅ |

**Response**
```json
{
  "items": [
    {
      "place_id": "...",
      "display_name": "Bengaluru, Karnataka, India",
      "lat": "12.9716",
      "lon": "77.5946"
    }
  ]
}
```

---

### `GET /api/rides/reverse`
Reverse geocoding (coordinates → address).

| Query param | Type | Required |
|-------------|------|----------|
| `lat` | number | ✅ |
| `lng` | number | ✅ |

**Response** — Nominatim reverse geocode object.

---

### `GET /api/rides/route`
Calculate a driving route between two points (via OSRM).

| Query param | Type | Required |
|-------------|------|----------|
| `pickupLat` | number | ✅ |
| `pickupLng` | number | ✅ |
| `dropoffLat` | number | ✅ |
| `dropoffLng` | number | ✅ |

**Response**
```json
{
  "geometry": { "type": "LineString", "coordinates": [[77.59, 12.97], ...] },
  "distanceMeters": 4200,
  "durationSeconds": 780
}
```

---

### `POST /api/rides/fare-estimate`
Get fare estimates across ride providers.

**Body**
```json
{
  "pickup": { "lat": 12.9716, "lng": 77.5946 },
  "dropoff": { "lat": 12.9352, "lng": 77.6245 }
}
```

**Response** — list of fare quotes per provider (Ola, Uber, Rapido, etc.).

---

### `GET /api/rides/available`
Get available ride types near a location.

| Query param | Type | Required |
|-------------|------|----------|
| `lat` | number | ✅ |
| `lng` | number | ✅ |

**Response** — available vehicle categories and estimated ETAs.

---

### `POST /api/rides/book`
Book a ride by quote ID.

**Body**
```json
{ "quoteId": "quote_abc123" }
```

**Response** — booking confirmation.

---

## Orders — `/api/orders`

**Auth** required on all order endpoints.

### `POST /api/orders`
Create a new order.

**Body**
```json
{
  "domain": "ecommerce",
  "provider": "Amazon",
  "title": "Apple iPhone 15 128GB",
  "itemUrl": "https://amazon.in/...",
  "amount": { "currency": "INR", "amount": 74999 },
  "metadata": { "asin": "B0CM..." },
  "paymentIntentId": "pi_optional"
}
```

`domain` must be one of: `ecommerce` | `food` | `rides` | `travel` | `hospitality`

**Response** `{ "order": { ... } }`

Order status on creation: `CREATED` (or `PAYMENT_PENDING` if `paymentIntentId` is provided).

---

### `GET /api/orders`
List the authenticated user's orders.

| Query param | Type | Default |
|-------------|------|---------|
| `limit` | number (1-100) | 50 |

**Response** `{ "items": [ { order } ] }`

---

### `GET /api/orders/:orderId`
Get a single order.

**Response** `{ "order": { ... } }`

**Error** `404 ORDER_NOT_FOUND`

---

### `POST /api/orders/:orderId/cancel`
Cancel an order.

**Errors**

| Code | Status |
|------|--------|
| `ORDER_NOT_FOUND` | 404 |
| `ORDER_ALREADY_CONFIRMED` | 409 |

Already-cancelled orders return 200 with the existing order (idempotent).

---

### `POST /api/orders/:orderId/payment-intent`
Create a Cashfree payment intent for an order.

**Body**
```json
{
  "customerPhone": "+919876543210",
  "customerEmail": "user@example.com",
  "customerName": "Alice",
  "returnUrl": "https://yourapp.com/payment/return",
  "notifyUrl": "https://yourapp.com/api/payments/webhooks/cashfree"
}
```

All fields optional — falls back to authenticated user's profile values. `customerPhone` is required (either in body or on user profile).

**Response**
```json
{
  "order": { "status": "PAYMENT_PENDING", ... },
  "payment": {
    "intent": {
      "intentId": "pi_...",
      "orderId": "cf_order_...",
      "paymentSessionId": "session_..."
    }
  }
}
```

**Errors**

| Code | Status |
|------|--------|
| `ORDER_NOT_FOUND` | 404 |
| `ORDER_CANCELLED` | 409 |
| `ORDER_ALREADY_CONFIRMED` | 409 |
| `MISSING_CUSTOMER_PHONE` | 400 |
| `PAYMENT_INTENT_BAD_RESPONSE` | 502 |

---

## Payments — `/api/payments`

Thin proxy to the Haskell payments microservice.

### `GET /api/payments/health`
Health check of the payments service.

---

### `POST /api/payments/intents`
Create a payment intent directly (without an order record).

**Auth** optional

**Headers**
- `Idempotency-Key` (optional) — forwarded to Haskell service

**Body**
```json
{
  "money": { "amount": 499.00, "currency": "INR" },
  "customer": {
    "customerId": "user_abc",
    "customerPhone": "+919876543210",
    "customerEmail": "user@example.com",
    "customerName": "Alice"
  },
  "returnUrl": "https://yourapp.com/payment/return",
  "notifyUrl": "https://yourapp.com/api/payments/webhooks/cashfree",
  "orderId": "my_order_123"
}
```

**Response** — proxied from Haskell service (Cashfree payment session).

---

### `GET /api/payments/intents/:intentId`
Fetch a payment intent status.

**Auth** optional

**Response** — proxied from Haskell service.

---

### `POST /api/payments/webhooks/cashfree`
Cashfree webhook receiver. Forwards raw body and Cashfree headers to Haskell service for signature verification.

**Headers forwarded**
- `x-webhook-timestamp`
- `x-webhook-signature`
- `x-webhook-version`
- `x-webhook-attempt`
- `x-idempotency-key`

**Response** — proxied from Haskell service.

---

## AI — `/api/ai`

### `POST /api/ai/recommendations`
Get AI-powered product/service recommendations.

**Body**
```json
{
  "query": "best budget phone under 20000",
  "domain": "ecommerce",
  "preferences": { "brand": "Samsung" }
}
```

**Response**
```json
{
  "recommendations": [ ... ],
  "reasoning": "Based on your query..."
}
```

---

### `GET /api/ai/price-prediction`
Get a price prediction for a product.

| Query param | Type | Required |
|-------------|------|----------|
| `productId` | string | ✅ |
| `platform` | string | ✅ |

**Response**
```json
{
  "productId": "...",
  "platform": "Amazon",
  "predictedPrice": 59999,
  "confidence": 0.85,
  "recommendation": "Wait 3-5 days for potential price drop"
}
```

---

### `GET /api/ai/review-summary`
Get an AI-generated review summary for an item.

| Query param | Type | Required |
|-------------|------|----------|
| `itemId` | string | ✅ |
| `domain` | DomainEnum | ❌ |

**Response**
```json
{
  "itemId": "...",
  "domain": "ecommerce",
  "pros": ["Good value", "Strong ratings"],
  "cons": ["Limited stock sometimes"],
  "verdict": "Recommended for most users at this price point"
}
```

---

## Users — `/api/users`

### `GET /api/users/profile`
Get the current user's profile.

**Auth** optional (returns guest profile if unauthenticated)

**Response**
```json
{
  "id": "user_abc",
  "name": "Alice",
  "email": "alice@example.com",
  "phone": null,
  "tier": "Free",
  "totalSavings": 0
}
```

---

### `PUT /api/users/profile`
Update profile fields.

**Auth** required

**Body**
```json
{ "name": "Alice Updated" }
```

**Response** `{ "success": true, "user": { ... } }`

---

### `PUT /api/users/preferences`
Update user preferences (arbitrary key-value).

**Auth** required

**Body** — any JSON object

**Response** `{ "success": true, "preferences": { ... }, "user": { ... } }`

---

### `GET /api/users/rewards`
Get cashback / rewards balance.

**Auth** optional

**Response**
```json
{
  "totalCashback": 0,
  "availableCashback": 0,
  "pendingCashback": 0,
  "tier": "Free"
}
```

---

### `GET /api/users/purchases`
Get purchase history.

**Auth** required

**Response** `{ "items": [] }`

---

## History — `/api/history`

### `GET /api/history`
Combined search and click history.

**Auth** required

| Query param | Type | Default |
|-------------|------|---------|
| `limit` | number (1-100) | 30 |

**Response**
```json
{
  "searches": [ ... ],
  "clicks": [ ... ]
}
```

---

## Ecommerce — `/api/ecommerce`

### `POST /api/ecommerce/search`
Simplified ecommerce search (no auth, minimal response shape).

**Body** `{ "query": "laptop" }`

**Response**
```json
{
  "query": "laptop",
  "results": [
    {
      "id": "...",
      "name": "Dell Inspiron 15",
      "price": 55999,
      "platform": "Flipkart",
      "rating": 4.3
    }
  ]
}
```

---

## Realtime — SSE — `/api/sse` *(replacing WebSocket)*

### `GET /api/sse/price-alerts`
Subscribe to price alert events.

**Auth** required

**Response headers**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Events**

`price-alert`
```
event: price-alert
data: {"alertId":"...","itemId":"...","newPrice":1999,"platform":"Amazon"}
```

`ping` (keepalive, every 30s)
```
event: ping
data: {}
```

> **Note:** The WebSocket / Socket.IO implementation is being removed. Use SSE for all server-push needs. The frontend should use the native `EventSource` API.

---

## Common error shapes

```json
{ "error": "ERROR_CODE" }
{ "error": "INVALID_BODY", "details": { "fieldErrors": { "email": ["Invalid email"] }, "formErrors": [] } }
```

| HTTP Status | Typical meaning |
|-------------|----------------|
| 400 | Validation failure or bad request |
| 401 | Not authenticated |
| 404 | Resource not found |
| 409 | Conflict (e.g. order already confirmed) |
| 501 | Feature not configured (e.g. SMS sender missing) |
| 502 | Upstream service failure |
| 500 | Internal error |
