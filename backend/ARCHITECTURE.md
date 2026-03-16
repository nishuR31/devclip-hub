# DevClipboard Hub - Microservice MVC + Repository Architecture

## System Overview

A **layered microservice backend** using Express.js + TypeScript following **MVC pattern with Repository abstraction**, automatic error handling, and async queue processing for scalability.

### Tech Stack

- **Framework**: Express.js (Node.js)
- **Language**: TypeScript
- **Database**: PostgreSQL (via Prisma ORM) + MongoDB (raw commands)
- **Cache**: Redis (with BullMQ for job queues)
- **Authentication**: JWT + refresh tokens + TOTP 2FA + OAuth
- **Payment**: Razorpay API integration
- **Email**: Sendgrid/Nodemailer (async via queue)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      HTTP Request                            │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Routes Layer         (src/routes/*)                        │
│  - Endpoint definitions                                      │
│  - HTTP method mapping                                       │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Middleware           (src/middleware/*)                    │
│  - Validation (Zod)                                          │
│  - Authentication (JWT)                                      │
│  - AsyncHandler (error wrapper)                              │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Controllers Layer    (src/controllers/*)                   │
│  - Request handling                                          │
│  - Response formatting                                       │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Services Layer       (src/services/*)                      │
│  - Business logic                                            │
│  - Orchestration                                             │
│  - Queue operations                                          │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Repository Layer     (src/repositories/*)                  │
│  - Data access                                               │
│  - Prisma/MongoDB queries                                    │
│  - Redis operations                                          │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Persistence Layer                                           │
│  ├─ PostgreSQL (Prisma)                                      │
│  ├─ MongoDB (raw commands)                                   │
│  └─ Redis (cache + queues)                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Architectural Principles

### 1. **Separation of Concerns**

Each layer has a single responsibility:

- **Routes**: HTTP protocol
- **Controllers**: Request/response handling
- **Services**: Business logic
- **Repositories**: Data access
- **Middleware**: Cross-cutting concerns

### 2. **Dependency Inversion**

- Controllers depend on services (abstraction), not implementations
- Services depend on repositories (abstraction), not database
- Enables testing, swapping implementations

### 3. **Error Centralization**

All errors flow to a single error handler middleware via `asyncHandler` wrapper.

### 4. **Async Job Processing**

Non-blocking operations (email, webhooks) processed via BullMQ queues.

---

## Layer Definitions

### Routes Layer (`src/routes/`)

**Purpose**: HTTP endpoint definitions and request validation.

**Responsibilities**:

- Map HTTP methods to controller functions
- Apply route-specific middleware
- Validate request schema
- **No business logic**

**Pattern**:

```typescript
// src/routes/auth.ts
import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authController } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { registerSchema } from "../validators/auth.validators";

const router = Router();

router.post(
  "/register",
  validate(registerSchema),
  asyncHandler(authController.register),
);

export default router;
```

**Key Files**:

- `auth.ts` - Authentication endpoints
- `users.ts` - User profile endpoints
- `workspace.ts`, `clipboard.ts`, `snippets.ts` - Workspace endpoints
- `payments.ts` - Payment endpoints
- `subscriptions.ts` - Subscription endpoints
- `webhooks.ts` - Webhook endpoints

---

### Middleware Layer (`src/middleware/`)

**Purpose**: Cross-cutting concerns (validation, auth, error handling).

#### validate.ts

- Zod schema validation
- Validates `req.body`, `req.params`, `req.query`
- Returns `400` with error details if invalid

#### auth.ts

- JWT token verification
- Extracts user ID from token
- Attaches `req.userId` and `req.user` to request
- Returns `401` if invalid/expired

#### errorHandler.ts

- Global error catch-all
- Formats error responses via `sendError()`
- Logs errors
- Returns appropriate HTTP status

#### asyncHandler.ts

- Wraps route handlers
- Catches promise rejections
- Delegates to errorHandler via `next(error)`

**Benefits**: No try-catch boilerplate in routes, consistent error handling.

---

### Controllers Layer (`src/controllers/`)

**Purpose**: Business logic orchestration and HTTP response formatting.

**Responsibilities**:

- Receive validated request data
- Call service methods
- Format response with `sendSuccess()` or `sendError()`
- Set HTTP headers, cookies, status codes
- **No direct database queries**

**Pattern**:

```typescript
// src/controllers/auth.controller.ts
import { sendSuccess, sendError } from "../utils/response";
import { authService } from "../services/auth.service";

export const authController = {
  async register(req, res) {
    const { email, password, name } = req.body; // validated by middleware

    const user = await authService.register(email, password, name);

    sendSuccess(res, "Registered successfully", 201, user);
  },

  async login(req, res) {
    const { email, password } = req.body;

    const { user, accessToken, refreshToken } = await authService.login(
      email,
      password,
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    sendSuccess(res, "Logged in", 200, { user, accessToken });
  },
};
```

**Key Files**:

- `auth.controller.ts` - Authentication logic
- `users.controller.ts` - User profile logic
- `workspace.controller.ts` - Workspace/clipboard/snippets logic
- `payments.controller.ts` - Payment processing logic
- `subscriptions.controller.ts` - Subscription management logic
- `webhooks.controller.ts` - Webhook event handling

---

### Services Layer (`src/services/`)

**Purpose**: Core business logic and orchestration.

**Responsibilities**:

- Implement domain rules
- Coordinate multiple repository calls
- Handle complex workflows
- Queue async jobs (email, webhooks)
- Validations and transformations
- **No HTTP knowledge**, **no direct Prisma calls**

**Pattern**:

```typescript
// src/services/auth.service.ts
import { authRepository } from "../repositories/auth.repository";
import { enqueueEmail } from "../queues/email.queue";
import * as bcrypt from "bcrypt";

export const authService = {
  async register(email: string, password: string, name: string) {
    // Business rule: check user doesn't exist
    const existing = await authRepository.findByEmail(email);
    if (existing) {
      throw new Error("Email already registered");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user via repository
    const user = await authRepository.create({
      email,
      password: hashedPassword,
      name,
    });

    // Queue welcome email (non-blocking)
    await enqueueEmail("welcome", email, { name });

    return user;
  },

  async login(email: string, password: string) {
    // Business rule: validate credentials
    const user = await authRepository.findByEmail(email);
    if (!user) throw new Error("User not found");

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new Error("Invalid password");

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(user.id);

    // Store refresh token
    await authRepository.createRefreshToken({
      userId: user.id,
      token: refreshToken,
    });

    return { user, accessToken, refreshToken };
  },
};
```

**Key Files**:

- `auth.service.ts` - Authentication business logic
- `user.service.ts` - User profile business logic
- `workspace.service.ts` - Workspace/clipboard/snippets business logic
- `payment.service.ts` - Payment processing and Razorpay integration
- `subscription.service.ts` - Subscription lifecycle management

---

### Repository Layer (`src/repositories/`)

**Purpose**: Data access abstraction for Prisma, MongoDB, and Redis.

**Responsibilities**:

- All database/cache operations
- Encapsulate query complexity
- Provide typed, reusable methods
- Optimize queries (includes, selects, where)
- **No business logic**, **pure CRUD**

**Pattern**:

```typescript
// src/repositories/auth.repository.ts
import { prisma } from "../lib/prisma";
import type { User } from "@prisma/client";

export const authRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  create(data: { email: string; password: string; name: string }) {
    return prisma.user.create({
      data,
      select: { id: true, email: true, name: true, createdAt: true },
    });
  },

  update(id: string, data: Partial<User>) {
    return prisma.user.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.user.delete({ where: { id } });
  },

  createRefreshToken(data: { userId: string; token: string }) {
    return prisma.refreshToken.create({ data });
  },

  findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({ where: { token } });
  },
};
```

**Repository Benefits**:

- Swap Prisma for raw SQL without changing services
- Centralize query optimization
- Consistent error handling
- Test by mocking repositories

**Key Files**:

- `auth.repository.ts` - User and token queries
- `user.repository.ts` - User profile queries
- `workspace.repository.ts` - MongoDB workspace/clipboard/snippets operations + Redis cache
- `subscription.repository.ts` - Subscription queries

---

## Utility & Infrastructure Layers

### Middleware (`src/middleware/`)

- **asyncHandler.ts**: Wraps handlers to catch rejections
- **auth.ts**: JWT verification
- **validate.ts**: Zod schema validation
- **errorHandler.ts**: Global error handling

### Utils (`src/utils/`)

- **response.ts**: `sendSuccess()`, `sendError()` with auto-flattening
- **asyncHandler.ts**: Error wrapper for route handlers
- **hashPassword.ts**: Bcrypt utilities
- **generateTokens.ts**: JWT token generation
- **verifySignature.ts**: HMAC-SHA256 signature verification

### Libs (`src/lib/`)

- **prisma.ts**: Singleton Prisma client
- **redis.ts**: Redis connection pool
- **nodemailer.ts**: Email transport
- **razorpay.ts**: Razorpay SDK client
- **google-oauth.ts**: Google OAuth client

### Queues (`src/queues/`)

- **email.queue.ts**: Async email sending via BullMQ
- **razorpay.queue.ts**: Webhook event async processing
- **cleanup.queue.ts**: Scheduled cleanup tasks

**Queue Benefits**:

- Non-blocking: request returns immediately
- Auto-retry: exponential backoff on failure
- Async: background workers process in parallel
- Resilient: failures don't crash HTTP server

### Configuration (`src/env.ts`)

Centralized environment variables with typing and defaults:

```typescript
export const env = {
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL!,
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  EMAIL_ENABLED: process.env.EMAIL_ENABLED !== "false",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID!,
  // ... more config
};
```

---

## Data Flow Example: User Registration

```
1. Client sends POST /api/auth/register with { email, password, name }
   ↓
2. Router middleware:
   - validate(registerSchema) checks schema ← returns 400 if invalid
   - asyncHandler wraps controller
   ↓
3. Controller (authController.register):
   - Receives validated req.body
   - Calls authService.register(email, password, name)
   ↓
4. Service (authService.register):
   - Business rule: authRepository.findByEmail(email) ← check unique
   - Hash password: bcrypt.hash(password, 10)
   - Create user: authRepository.create({email, hashedPassword, name})
   - Queue email: enqueueEmail("welcome", email, {name})
   - Return user object
   ↓
5. Repository (authRepository.create):
   - prisma.user.create({data: {...}})
   - Select only needed fields for security
   - Return created user
   ↓
6. Controller formats response:
   - sendSuccess(res, "Registered successfully", 201, user)
   ↓
7. Response utility flattens object:
   {
     "success": true,
     "message": "Registered successfully",
     "id": "user-123",
     "email": "user@example.com",
     "name": "John"
   }
   ↓
8. Client receives 201 response with user data
   ↓
9. Background: Email queue worker processes async
   - Worker calls enqueueEmail listener
   - Sends welcome email via Nodemailer
   - Retries on failure with exponential backoff
```

---

## Module Structure Example (Auth Module)

```
backend/src/
├── routes/
│   └── auth.ts                          # POST/GET endpoints
├── controllers/
│   └── auth.controller.ts               # Request → Service → Response
├── services/
│   └── auth.service.ts                  # Business logic (register, login, ...)
├── repositories/
│   └── auth.repository.ts               # Database queries
├── middleware/
│   ├── auth.ts                          # JWT verification
│   └── validate.ts                      # Zod schema validation
├── validators/
│   └── auth.validators.ts               # Zod schemas for auth endpoints
├── utils/
│   ├── response.ts                      # sendSuccess/sendError
│   ├── asyncHandler.ts                  # Error wrapper
│   └── generateTokens.ts                # JWT generation
├── lib/
│   ├── prisma.ts                        # Prisma client
│   └── nodemailer.ts                    # Email setup
├── queues/
│   └── email.queue.ts                   # Async email queue
├── prisma/
│   └── schema.prisma                    # User, RefreshToken models
└── env.ts                               # Configuration
```

---

## Implemented Modules

### 1. **Authentication** (`auth/*`)

Endpoints: register, login, 2FA setup/verify, magic link, OAuth (Google), token refresh, logout

- Register with email verification
- Login with password + optional 2FA
- JWT access token (short-lived) + refresh token (long-lived)
- Refresh token family + reuse detection
- TOTP-based 2FA
- Magic links via Redis OTP
- Google OAuth integration
- Token revocation

### 2. **User Management** (`users/*`)

Endpoints: get profile (with subscription), update profile, delete account

- Fetch user with subscription details
- Update name/avatar
- Delete account with Razorpay cleanup

### 3. **Workspace Management** (`workspace/*, clipboard/*, snippets/*`)

Endpoints: CRUD for clipboard entries and code snippets, team member management

- Clipboard: text, code, URL, JSON entries
- Snippets: code storage with language tagging
- Plan-gated: FREE (localStorage) vs PAID (cloud)
- Team members: invite, role management
- Redis caching with 60s TTL
- MongoDB persistence

### 4. **Payments** (`payments/*`)

Endpoints: create checkout session, verify payment

- Razorpay subscription creation
- HMAC-SHA256 signature verification
- Plan → subscription mapping
- Payment confirmation email

### 5. **Subscriptions** (`subscriptions/*`)

Endpoints: list plans, get user subscription, cancel at period end

- Public plan catalog (FREE, PRO, ENTERPRISE)
- User subscription status
- Cancellation with Razorpay sync
- Reactivation prompts

### 6. **Webhooks** (`webhooks/*`)

Endpoints: Razorpay event webhook handler

- Webhook signature validation
- Async event processing via BullMQ
- Subscription state sync (activated, charged, halted, cancelled)

---

## Response Normalization

All endpoints return consistent JSON structure:

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  // Object payloads are flattened for backward compatibility
  "userId": "123",
  "email": "user@example.com"
  // Array/scalar payloads wrapped in {data: ...}
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE"
}
```

**Magic Flattening**: If payload is a plain object, properties spread to top-level. Otherwise wrapped in `{data: ...}` for backward compatibility.

---

## Request Validation

Zod schemas in `src/validators/` validate all inputs:

```typescript
// src/validators/auth.validators.ts
import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(2),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
});
```

Routes apply validators via middleware:

```typescript
router.post(
  "/register",
  validate(registerSchema),
  asyncHandler(authController.register),
);
```

---

## Error Handling Flow

```
Error thrown in service/controller
  ↓
asyncHandler catches via Promise.resolve().catch()
  ↓
next(error) delegates to errorHandler middleware
  ↓
errorHandler.ts formats response
  ↓
sendError(res, message, statusCode, extra)
  ↓
Response sent with consistent error shape
```

**Benefits**: Single error handler, no try-catch boilerplate, consistent error responses.

---

## Testing Strategy

### Unit Testing

- Mock repositories
- Test service business logic in isolation
- No database/network calls

### Integration Testing

- Test route → controller → service flow
- Use test database
- Verify response format

### Example:

```typescript
describe("authService", () => {
  it("should register user and queue email", async () => {
    const mockRepo = { findByEmail: jest.fn(), create: jest.fn() };
    const mockQueue = { enqueue: jest.fn() };

    // When email already exists
    mockRepo.findByEmail.mockResolvedValue({ email: "test@example.com" });

    // Expect error
    await expect(
      authService.register("test@example.com", "password", "John"),
    ).rejects.toThrow("Email already registered");
  });
});
```

---

## Deployment Considerations

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/devclipboard
MONGODB_URL=mongodb://localhost:27017/devclipboard

# Cache
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# OAuth
GOOGLE_CLIENT_ID=your-google-id
GOOGLE_CLIENT_SECRET=your-google-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback/google

# Email
EMAIL_ENABLED=true
SENDGRID_API_KEY=your-sendgrid-key

# Payment
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# Server
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
```

### Performance Optimization

- Redis caching for workspace entries (60s TTL)
- BullMQ for async jobs (non-blocking)
- Prisma connection pooling
- Database query selectivity (select only needed fields)

### Scalability

- Horizontal scaling: stateless route handlers
- Distributed caching: Redis
- Job queue: BullMQ backed by centralized Redis
- Database: PostgreSQL with connection pooling

---

## Development Workflow

1. **Define Route** (`routes/module.ts`)
   - Add endpoint, middleware, validation

2. **Create Controller** (`controllers/module.controller.ts`)
   - Handle request, format response

3. **Implement Service** (`services/module.service.ts`)
   - Business logic, orchestration

4. **Build Repository** (`repositories/module.repository.ts`)
   - Data access layer

5. **Test Locally**

   ```bash
   npm run dev          # Start with hot-reload
   npm run build        # TypeScript check
   npm test             # Unit tests
   ```

6. **Deploy**
   ```bash
   npm run build        # Compile
   npm run start        # Run in production
   ```

---

## Key Takeaways

✅ **Layered Architecture**: Routes → Controllers → Services → Repositories  
✅ **Type Safety**: End-to-end TypeScript with Prisma types  
✅ **Error Handling**: Centralized via asyncHandler + errorHandler  
✅ **Scalability**: Async queues, Redis caching, connection pooling  
✅ **Consistency**: Response normalization, validation, error formats  
✅ **Modularity**: Each module follows same pattern, easy to extend  
✅ **Testability**: Repository abstraction enables mocking  
✅ **Maintainability**: Clear separation of concerns, single responsibility
