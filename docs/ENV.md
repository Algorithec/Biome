# Environment Variables

## Backend (Node/Express)

| Variable               | Default                    | Required       | Description                               |
| ---------------------- | -------------------------- | -------------- | ----------------------------------------- |
| `PORT`                 | `3000`                     | No             | Port for the Express server               |
| `JWT_SECRET`           | `dev_jwt_secret_change_me` | **Yes (prod)** | Secret for signing JWTs                   |
| `CORS_ORIGIN`          | `http://localhost:3001`    | No             | Comma-separated list of allowed origins   |
| `MONGODB_URI`          | _(in-memory fallback)_     | **Yes (prod)** | MongoDB connection string                 |
| `NODE_ENV`             | _(unset)_                  | No             | Set to `production` to enable prod guards |
| `FRONTEND_URL`         | Derived from request       | No             | Used for OAuth redirects and deep-links   |
| `PAYMENTS_SERVICE_URL` | `http://localhost:4010`    | No             | URL of the Haskell payments microservice  |

### Google OAuth

| Variable               | Required               | Description                                         |
| ---------------------- | ---------------------- | --------------------------------------------------- |
| `GOOGLE_CLIENT_ID`     | To enable Google login | Google OAuth2 client ID                             |
| `GOOGLE_CLIENT_SECRET` | To enable Google login | Google OAuth2 client secret                         |
| `GOOGLE_REDIRECT_URI`  | No                     | Defaults to `<request origin>/auth/google/callback` |

### OTP — Email (SendGrid)

| Variable           | Required            | Description          |
| ------------------ | ------------------- | -------------------- |
| `SENDGRID_API_KEY` | To enable email OTP | SendGrid API key     |
| `SENDGRID_FROM`    | To enable email OTP | Sender email address |

### OTP — SMS (Twilio)

| Variable             | Required          | Description                |
| -------------------- | ----------------- | -------------------------- |
| `TWILIO_ACCOUNT_SID` | To enable SMS OTP | Twilio account SID         |
| `TWILIO_AUTH_TOKEN`  | To enable SMS OTP | Twilio auth token          |
| `TWILIO_FROM`        | To enable SMS OTP | Twilio "from" phone number |

## Frontend (Vite)

Vite env vars must be prefixed `VITE_` to be exposed to the browser.

| Variable                   | Required          | Description                                           |
| -------------------------- | ----------------- | ----------------------------------------------------- |
| `VITE_GOOGLE_MAPS_API_KEY` | For maps features | Google Maps JavaScript API key                        |
| `VITE_GOOGLE_MAP_ID`       | No                | Google Maps Map ID (for custom styling)               |
| `VITE_API_URL`             | No                | Override API base URL (default: `/api` via dev proxy) |

## Haskell Payments Service

See `payments-hs/` for its own configuration. Key vars:

| Variable              | Description                                    |
| --------------------- | ---------------------------------------------- |
| `CASHFREE_APP_ID`     | Cashfree merchant App ID                       |
| `CASHFREE_SECRET_KEY` | Cashfree secret key                            |
| `CASHFREE_ENV`        | `sandbox` or `production`                      |
| `PORT`                | Port for the Haskell service (default: `4010`) |

## Example `.env` for local dev

```bash
# Backend
PORT=3000
JWT_SECRET=change_me_in_dev_too
CORS_ORIGIN=http://localhost:3001
# MONGODB_URI=mongodb://localhost:27017/biome   # omit for in-memory

# Google OAuth (optional in dev)
# GOOGLE_CLIENT_ID=...
# GOOGLE_CLIENT_SECRET=...

# OTP senders (dev OTP is returned in response body — no sender needed)
# SENDGRID_API_KEY=...
# SENDGRID_FROM=noreply@yourapp.com
# TWILIO_ACCOUNT_SID=...
# TWILIO_AUTH_TOKEN=...
# TWILIO_FROM=+1...

# Payments
PAYMENTS_SERVICE_URL=http://localhost:4010
```

```bash
# Frontend (.env.local in root)
VITE_GOOGLE_MAPS_API_KEY=AIza...
```
