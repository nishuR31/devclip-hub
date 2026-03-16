# DevClipboard Hub

A cloud-synced clipboard manager and code snippet organiser for developers. Built as a full-stack SaaS with tiered subscription billing via Razorpay.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Features](#features)
- [Plan Tiers](#plan-tiers)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running in Development](#running-in-development)
- [Building for Production](#building-for-production)
- [API Reference](#api-reference)
- [Payment Flow](#payment-flow)
- [Feature Gating](#feature-gating)

---

## Overview

DevClipboard Hub lets developers store, organise, and sync clipboard items and code snippets across devices. Free accounts are supported with generous limits; paid plans unlock cloud sync, extended storage, team sharing, and advanced developer tools.

---

## Tech Stack

**Frontend**

| Layer         | Technology                      |
| ------------- | ------------------------------- |
| Framework     | React 18 + TypeScript           |
| Build         | Vite 5                          |
| Routing       | React Router v6                 |
| Server state  | TanStack Query v5               |
| Forms         | React Hook Form + Zod           |
| UI components | shadcn/ui (Radix UI primitives) |
| Styling       | Tailwind CSS 3                  |
| Charts        | Recharts                        |

**Backend**

| Layer          | Technology                                        |
| -------------- | ------------------------------------------------- |
| Runtime        | Node.js (ESM) + TypeScript                        |
| Framework      | Express 4                                         |
| Database       | MongoDB Atlas via Prisma 5                        |
| Cache / Queues | Redis + BullMQ                                    |
| Auth           | JWT (access + refresh + 2FA tokens)               |
| Payments       | Razorpay Subscriptions                            |
| Email          | Gmail SMTP via Nodemailer                         |
| Security       | Helmet, express-rate-limit, bcrypt, TOTP (otplib) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser  (Vite dev: :8080 → proxied to :3001)          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  React SPA                                        │   │
│  │  AuthContext  (in-memory access token)            │   │
│  │  SubscriptionContext  (live plan, limits)         │   │
│  │  FeatureGate  (frontend plan enforcement)         │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │ /api/*  (Bearer token + httpOnly cookie)
┌──────────────────────▼──────────────────────────────────┐
│  Express Server  (:3001)                                 │
│  authenticate()  →  live plan lookup from MongoDB        │
│  requirePlan()   →  server-side tier enforcement         │
│                                                          │
│  Routes: /auth  /users  /subscriptions  /payments        │
│          /webhooks (Razorpay HMAC-verified)              │
│                                                          │
│  BullMQ workers: email · razorpay-events · cleanup       │
└──────────┬───────────────────┬──────────────────────────┘
           │                   │
    MongoDB Atlas           Redis (Upstash)
```

**Token strategy**

- Access token — 15 min, stored in memory only (never `localStorage`)
- Refresh token — 7 days, `httpOnly` cookie, hashed before DB storage
- Silent refresh — `POST /api/auth/refresh` on every app mount and on `401`
- 2FA token — 5 min, used to complete TOTP login
- TOTP secrets — AES-256 encrypted at rest

---

## Features

- **Authentication** — email/password registration with OTP email verification, magic-link login, password reset, 2FA (TOTP) setup, httpOnly refresh token rotation
- **Subscription billing** — Razorpay subscription checkout modal, payment signature verification, webhook-driven status updates, cancel-at-period-end
- **Feature gating** — frontend `<FeatureGate>` component and server-side `requirePlan()` middleware enforce plan limits on every request
- **Clipboard manager** — store and search clipboard items with per-plan storage limits
- **Snippet organiser** — code snippets with syntax categories; export to JSON / CSV / TXT (Starter+)
- **Device Inspector** — browser storage tools (IDB, Cache API, Service Workers) — advanced tabs gated to Starter+
- **Cloud sync** — cross-device sync gated to Starter+
- **Team sharing** — shared snippet collections, up to 5 members (Team plan)
- **Dark mode** — system-aware via `next-themes`
- **Multi-currency pricing** — live exchange rates via Frankfurter API; display in INR / USD / EUR / GBP

---

## Plan Tiers

| Plan        | Clipboard   | Snippets  | Price                  |
| ----------- | ----------- | --------- | ---------------------- |
| **Free**    | 50 items    | 10        | Free                   |
| **Starter** | 500 items   | Unlimited | ₹299/mo · ₹2,499/yr    |
| **Pro**     | 2,000 items | Unlimited | ₹599/mo · ₹4,999/yr    |
| **Team**    | Unlimited   | Unlimited | ₹1,499/mo · ₹11,999/yr |

All paid plans include a **7-day free trial**. Cancel anytime.

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- A running Redis instance (local or [Upstash](https://upstash.com))
- MongoDB Atlas cluster
- Razorpay account with subscription plans created
- Gmail account with an [App Password](https://myaccount.google.com/apppasswords) generated

### Installation

```bash
# 1. Clone
git clone <repo-url>
cd devclip-hub

# 2. Install root dependencies (frontend)
npm install

# 3. Install frontend dependencies
npm install --prefix frontend

# 4. Install backend dependencies
npm install --prefix backend
```

---

## Environment Variables

Copy the example file and fill in your values:

```bash
cp backend/.env.example backend/.env
```

See [`backend/.env.example`](backend/.env.example) for all variables with inline documentation.

**Required before first run:**

| Variable                                  | Where to get it                                                            |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| `DATABASE_URL`                            | MongoDB Atlas → Connect → Drivers                                          |
| `REDIS_URL`                               | Upstash dashboard or local Redis                                           |
| `ACCESS_TOKEN_SECRET`                     | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `REFRESH_TOKEN_SECRET`                    | same as above                                                              |
| `TWO_FACTOR_TOKEN_SECRET`                 | same as above                                                              |
| `TOTP_ENCRYPTION_KEY`                     | same as above                                                              |
| `EMAIL_FROM` / `EMAIL_FROM_PASS`          | Gmail + App Password                                                       |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay Dashboard → Settings → API Keys                                   |
| `RAZORPAY_WEBHOOK_SECRET`                 | Razorpay Dashboard → Webhooks                                              |
| `RAZORPAY_*_PLAN_ID`                      | Razorpay Dashboard → Products → Plans                                      |

**Creating Razorpay plans**

Create six subscription plans in the Razorpay dashboard matching these amounts (in paise):

| Plan            | Interval | Paise   |
| --------------- | -------- | ------- |
| Starter monthly | monthly  | 29900   |
| Starter yearly  | yearly   | 249900  |
| Pro monthly     | monthly  | 59900   |
| Pro yearly      | yearly   | 499900  |
| Team monthly    | monthly  | 149900  |
| Team yearly     | yearly   | 1199900 |

Copy each plan's ID into the corresponding `RAZORPAY_*_PLAN_ID` variable.

---

## Running in Development

```bash
# Starts frontend (:8080) and backend (:3001) concurrently
npm run dev
```

The Vite dev server proxies all `/api/*` requests to `localhost:3001` automatically.

To run them separately:

```bash
npm run dev:frontend   # Vite frontend
npm run dev:backend    # tsx watch backend
```

**First-time DB setup:**

```bash
cd backend
npx prisma db push   # Push schema to MongoDB Atlas
npx prisma generate  # Generate Prisma client
```

---

## Building for Production

```bash
npm run build
# Output: dist/ (frontend only, for Vercel/static deployment)

npm run build:full
# Output: frontend/dist/ + backend/dist/
```

Start the production server:

```bash
NODE_ENV=production node backend/dist/index.js
```

Serve the frontend `frontend/dist/` directory via a static host, routing all requests to `index.html` for client-side routing.
For Vercel deployments, set `VITE_API_BASE_URL` to your separately deployed backend origin.

**Production checklist**

- [ ] Set `NODE_ENV=production`
- [ ] Set `FRONTEND_URL` to your actual domain
- [ ] Switch Razorpay keys from `rzp_test_*` to `rzp_live_*`
- [ ] Register the Razorpay webhook URL: `https://your-domain.com/api/webhooks/razorpay`
- [ ] Ensure Redis and MongoDB Atlas are reachable from the server
- [ ] Run `prisma generate` before starting

---

## API Reference

All authenticated endpoints require `Authorization: Bearer <accessToken>`.

### Auth — `/api/auth`

| Method | Path                   | Description                                   |
| ------ | ---------------------- | --------------------------------------------- |
| POST   | `/register`            | Register (sends OTP email)                    |
| POST   | `/verify-email`        | Verify email with 6-digit OTP                 |
| POST   | `/resend-verification` | Resend OTP                                    |
| POST   | `/login`               | Login; returns tokens or `requires2FA` flag   |
| POST   | `/logout`              | Revoke refresh token                          |
| POST   | `/refresh`             | Rotate refresh token, return new access token |
| POST   | `/2fa/setup`           | Generate TOTP secret + QR code                |
| POST   | `/2fa/enable`          | Confirm TOTP to enable 2FA                    |
| POST   | `/2fa/disable`         | Disable 2FA (requires password)               |
| POST   | `/2fa/verify`          | Complete 2FA login                            |
| POST   | `/magic-link`          | Send magic link                               |
| POST   | `/magic-link/verify`   | Verify magic link token                       |
| POST   | `/forgot-password`     | Send reset OTP                                |
| POST   | `/reset-password`      | Reset password with OTP                       |
| PUT    | `/change-password`     | Change password (authenticated)               |

### Subscriptions — `/api/subscriptions`

| Method | Path      | Auth     | Description                         |
| ------ | --------- | -------- | ----------------------------------- |
| GET    | `/plans`  | Public   | List plans with Razorpay plan IDs   |
| GET    | `/me`     | Required | Current user's subscription         |
| POST   | `/cancel` | Required | Schedule cancellation at period end |

### Payments — `/api/payments`

| Method | Path        | Description                                                |
| ------ | ----------- | ---------------------------------------------------------- |
| POST   | `/checkout` | Create Razorpay subscription → `{ subscriptionId, keyId }` |
| POST   | `/verify`   | Verify payment signature after checkout                    |

### Webhooks — `/api/webhooks`

| Method | Path        | Description                                                     |
| ------ | ----------- | --------------------------------------------------------------- |
| POST   | `/razorpay` | HMAC-verified; enqueues subscription lifecycle events to BullMQ |

---

## Payment Flow

```
User clicks "Upgrade"
  → Frontend calls POST /api/payments/checkout { planId }
  → Server creates Razorpay subscription → returns { subscriptionId, keyId }
  → Frontend opens Razorpay checkout modal
  → User completes payment / enters card details
  → Razorpay calls handler({ razorpay_payment_id, razorpay_subscription_id, razorpay_signature })
  → Frontend calls POST /api/payments/verify { ...signature fields }
  → Server: HMAC-SHA256 verify → fetch subscription from Razorpay → update DB
  → SubscriptionContext re-fetches; plan gates unlock immediately

Background (webhooks):
  → Razorpay sends subscription lifecycle events to POST /api/webhooks/razorpay
  → HMAC verified → enqueued to BullMQ razorpay-events queue
  → Worker processes: activated / charged / halted / cancelled / completed
  → DB updated → live plan lookup on next request reflects change
```

---

## Feature Gating

Plan enforcement happens at two layers:

**Frontend — `<FeatureGate>`**

```tsx
import { FeatureGate } from "@/components/subscription/FeatureGate";

<FeatureGate requires="STARTER">
  <CloudSyncPanel />
</FeatureGate>;
```

Renders `<UpgradePrompt>` when the user's plan is below the required tier. Subscription state is fetched from `/api/subscriptions/me` on login and cached in `SubscriptionContext`.

**Backend — `requirePlan()`**

```ts
import { requirePlan } from "../middleware/requirePlan";

router.get("/export", authenticate, requirePlan("STARTER"), handler);
```

The `authenticate` middleware fetches the live plan from MongoDB on every request — plan changes take effect immediately without requiring a new token.

Plan hierarchy: `FREE (0) < STARTER (1) < PRO (2) < TEAM (3)`
