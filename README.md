# DevClipboard Hub

Full-stack clipboard and snippets platform with subscription billing, implemented as a monorepo with a modular MVC backend.

## Monorepo Structure

```
devclip-hub-main/
├─ frontend/   # React + Vite app
├─ backend/    # Express + TypeScript API
├─ API.md
└─ README.md
```

## What This Project Implements

- Clipboard and snippets management
- Auth stack (JWT, refresh token, 2FA, magic-link, OAuth scaffold)
- Subscription billing (Razorpay checkout, verify, webhooks)
- Modular backend architecture: routes → controllers → services → repositories
- Shared response/error wrappers and async handler abstraction

## Backend Architecture (Professional Summary)

The backend follows a strict layered pattern for maintainability and testability:

- `routes/`: HTTP wiring + middleware + validation only
- `controllers/`: request parsing + response shaping only
- `services/`: business logic and orchestration
- `repositories/`: Prisma/Mongo/Redis data access abstraction
- `utils/`: wrappers (`sendSuccess`, `sendError`, `asyncHandler`)
- `lib/`: infrastructure clients (Prisma, Redis, Razorpay, mail)
- `config/`: typed environment and domain constants

## Quick Start

### 1) Install dependencies

```bash
npm install
npm --prefix frontend install
npm --prefix backend install
```

### 2) Configure environment

```bash
cp backend/.env.example backend/.env
```

Fill required backend variables (`DATABASE_URL`, `REDIS_URL`, JWT secrets, Razorpay keys, etc.).

### 3) Run in development

```bash
npm run dev
```

Or run individually:

```bash
npm run dev:frontend
npm run dev:backend
```

## Build Commands

- `npm run build` → builds frontend
- `npm run build:full` → builds frontend + backend
- `npm run build:backend` → builds backend only

## Key Docs (Kept Minimal)

- `backend/ARCHITECTURE.md` — backend layered architecture details
- `backend/API.md` — backend endpoint reference
- `backend/SETUP.md` — setup and local run guide

## Reusable Prompt (MVP Microservice + MVC + Monorepo)

Use this prompt when you want the same architecture style generated/refactored:

```text
Build/refactor this project as an MVP monorepo with:

- frontend/ and backend/ separation
- Backend in Express + TypeScript using strict layered architecture:
  routes -> controllers -> services -> repositories
- Keep controllers thin (HTTP in/out only), business logic in services,
  all DB/cache access in repositories.
- Add shared wrappers/utilities:
  - asyncHandler for centralized async error forwarding
  - sendSuccess/sendError response helpers
  - global error middleware
- Keep config strongly typed (env + constants) under config/
- Keep infra clients under lib/ (prisma, redis, payment provider, mail)
- Use modular folders per domain (auth, users, workspace, payments, subscriptions, webhooks)
- Preserve existing API contracts unless explicitly asked to version/break them
- Prefer minimal, production-oriented structure; avoid overengineering
- After refactor, run build and startup sanity checks and report changed files.
```

## Engineering Notes

- Keep module boundaries strict; avoid service → HTTP coupling.
- Prefer repository methods over direct ORM usage in services.
- Keep docs concise and centralized (avoid excessive markdown sprawl).
  | POST | `/verify-email` | Verify email with 6-digit OTP |
  | POST | `/resend-verification` | Resend OTP |
  | POST | `/login` | Login; returns tokens or `requires2FA` flag |
  | POST | `/logout` | Revoke refresh token |
  | POST | `/refresh` | Rotate refresh token, return new access token |
  | POST | `/2fa/setup` | Generate TOTP secret + QR code |
  | POST | `/2fa/enable` | Confirm TOTP to enable 2FA |
  | POST | `/2fa/disable` | Disable 2FA (requires password) |
  | POST | `/2fa/verify` | Complete 2FA login |
  | POST | `/magic-link` | Send magic link |
  | POST | `/magic-link/verify` | Verify magic link token |
  | POST | `/forgot-password` | Send reset OTP |
  | POST | `/reset-password` | Reset password with OTP |
  | PUT | `/change-password` | Change password (authenticated) |

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
