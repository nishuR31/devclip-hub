# Setup & Getting Started Guide

## Prerequisites

- **Node.js**: v18+ (download from https://nodejs.org/)
- **npm**: v9+ (comes with Node.js)
- **PostgreSQL**: v14+ (for relational data)
- **MongoDB**: v5+ (for workspace data) - **Optional**: Can skip if using PostgreSQL for everything
- **Redis**: v7+ (for caching and job queues)

## Installation

### Setup Environment Variables

Create `.env` file in backend directory:

```bash
# Server
PORT=3001
NODE_ENV=development

# Database - PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/devclipboard_dev"

# Database - MongoDB (optional)
MONGODB_URL="mongodb://localhost:27017/devclipboard_dev"

# Cache
REDIS_URL="redis://localhost:6379"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
JWT_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"

# OAuth - Google
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3001/api/auth/oauth/google/callback"

# Email Configuration
EMAIL_ENABLED=true
SENDGRID_API_KEY="your-sendgrid-api-key"
# OR use SMTP
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@devclipboard.com"

# Payment - Razorpay
RAZORPAY_KEY_ID="your-razorpay-key-id"
RAZORPAY_KEY_SECRET="your-razorpay-key-secret"
RAZORPAY_WEBHOOK_SECRET="your-razorpay-webhook-secret"

# Frontend URL (for CORS and redirects)
FRONTEND_URL="http://localhost:3000"
```


### 6. Verify Setup

```bash
# Build TypeScript
npm run build

# Should output: no errors
```

---

## Running the Application

### Development Mode (with hot-reload)

```bash
npm run dev
```

Output:

```
[Server] Running on http://localhost:3001 (development)
```

### Production Build & Run

```bash
npm run build
npm run start
```

### Testing

```bash
npm test                    # Run all tests
npm test -- --watch       # Watch mode
npm test -- --coverage    # With coverage report
```

---

## Docker Setup (Alternative)

### Option 1: Docker Compose (Recommended)

Create `docker-compose.yml` in root:

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: devclipboard_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  app:
    build: .
    port:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/devclipboard_dev
      - MONGODB_URL=mongodb://mongodb:27017/devclipboard_dev
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - mongodb
      - redis
    volumes:
      - .:/app
      - /app/node_modules

volumes:
  postgres_data:
  mongo_data:
  redis_data:
```

Start all services:

```bash
docker-compose up
```

Stop services:

```bash
docker-compose down
```

---

## Database Operations

### Create or Update Database Schema

```bash
npm run prisma:generate    # Generate Prisma client
npm run prisma:push        # Push schema to database
```

### Database Migrations

```bash
# Create a migration
npx prisma migrate dev --name add_user_table

# Apply migrations
npx prisma migrate deploy

# View migration status
npx prisma migrate status
```

### Database Seed (Optional)

```bash
npx prisma db seed
```

---

## Environment Variable Configuration

### Development

- `NODE_ENV=development`
- `EMAIL_ENABLED=false` (skip email sending locally)
- `GOOGLE_CLIENT_ID/SECRET` (optional, can be blank)

### Staging

- `NODE_ENV=staging`
- `EMAIL_ENABLED=true`
- `DATABASE_URL` → staging database
- All payment vars configured

### Production

- `NODE_ENV=production`
- All secrets strong (32+ chars)
- HTTPS enforced
- CORS restricted to frontend domain
- Rate limiting enabled
- Redis eviction: `noeviction`

---

## Testing Endpoints Locally

### Using cURL

```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123",
    "name": "Test User"
  }'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'

# Get profile (with accessToken)
curl -X GET http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer <accessToken>"
```

### Using Postman

1. Import collection from `postman-collection.json`
2. Set environment variables:
   - `baseUrl` = `http://localhost:3001/api`
   - `accessToken` = (from login response)
   - `refreshToken` = (from login response)
3. Run requests

### Using REST Client (VS Code)

Create `test-requests.http`:

```http
### Health Check
GET http://localhost:3001/api/health

### Register
POST http://localhost:3001/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "TestPassword123",
  "name": "Test User"
}

### Login
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "TestPassword123"
}

### Get Profile
GET http://localhost:3001/api/users/profile
Authorization: Bearer {{accessToken}}
```

Install extension: **REST Client** by Huachao Mao

---

## Development Workflow

### 1. Create New Module

Create directory structure:

```
src/
├── routes/newmodule.ts
├── controllers/newmodule.controller.ts
├── services/newmodule.service.ts
├── repositories/newmodule.repository.ts
└── validators/newmodule.validators.ts
```

### 2. Define Database Model

Edit `src/prisma/schema.prisma`:

```prisma
model NewModule {
  id        String   @id @default(cuid())
  userId    String
  name      String
  data      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

Push to database:

```bash
npm run prisma:push
```

### 3. Create Repository

```typescript
// src/repositories/newmodule.repository.ts
import { prisma } from "../lib/prisma";

export const newmoduleRepository = {
  findById(id: string) {
    return prisma.newModule.findUnique({ where: { id } });
  },

  findByUserId(userId: string) {
    return prisma.newModule.findMany({ where: { userId } });
  },

  create(userId: string, data: { name: string; data: string }) {
    return prisma.newModule.create({
      data: { userId, ...data },
    });
  },

  update(id: string, data: Partial<NewModule>) {
    return prisma.newModule.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.newModule.delete({ where: { id } });
  },
};
```

### 4. Create Service

```typescript
// src/services/newmodule.service.ts
import { newmoduleRepository } from "../repositories/newmodule.repository";

export const newmoduleService = {
  async list(userId: string) {
    return await newmoduleRepository.findByUserId(userId);
  },

  async create(userId: string, name: string, data: string) {
    return await newmoduleRepository.create(userId, { name, data });
  },
};
```

### 5. Create Controller

```typescript
// src/controllers/newmodule.controller.ts
import { sendSuccess } from "../utils/response";
import { newmoduleService } from "../services/newmodule.service";

export const newmoduleController = {
  async list(req, res) {
    const items = await newmoduleService.list(req.userId);
    sendSuccess(res, "Items retrieved", 200, { data: items });
  },

  async create(req, res) {
    const { name, data } = req.body;
    const item = await newmoduleService.create(req.userId, name, data);
    sendSuccess(res, "Item created", 201, item);
  },
};
```

### 6. Create Validators

```typescript
// src/validators/newmodule.validators.ts
import { z } from "zod";

export const createNewModuleSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    data: z.string(),
  }),
});
```

### 7. Create Routes

```typescript
// src/routes/newmodule.ts
import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { auth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { newmoduleController } from "../controllers/newmodule.controller";
import { createNewModuleSchema } from "../validators/newmodule.validators";

const router = Router();

router.get("/", auth, asyncHandler(newmoduleController.list));
router.post(
  "/",
  auth,
  validate(createNewModuleSchema),
  asyncHandler(newmoduleController.create),
);

export default router;
```

### 8. Register Routes

In `src/index.ts`:

```typescript
import newmoduleRoutes from "./routes/newmodule";

app.use("/api/newmodule", newmoduleRoutes);
```

### 9. Test

```bash
npm run dev
# Test endpoints via Postman or cURL
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find and kill process on port 3001
lsof -ti:3001 | xargs kill -9
# Or change port in .env: PORT=3002
```

### Database Connection Error

```bash
# Check PostgreSQL is running
psql -U postgres

# Check MongoDB is running
mongo localhost:27017

# Check Redis is running
redis-cli ping
```

### Prisma Client Generation Failed

```bash
# Regenerate
npm run prisma:generate

# Clear cache and reinstall
rm -rf node_modules/.prisma
npm install
npm run prisma:generate
```

### JWT Token Issues

```bash
# Ensure JWT_SECRET and JWT_REFRESH_SECRET are set in .env
# Token should be sent in Authorization header: Bearer <token>
```

### Email Not Sending

```bash
# Check EMAIL_ENABLED=true in .env
# Verify SENDGRID_API_KEY or SMTP credentials
# Check email queue: npm run dev (watch logs)
```

### Type Errors in IDE

```bash
# Regenerate Prisma types
npm run prisma:generate

# Restart TypeScript server (VS Code: Cmd+Shift+P → TypeScript: Restart TS Server)
```

---

## Performance Tips

1. **Enable Query Logging** (development only)

```env
DATABASE_LOGGING=query
```

2. **Monitor Redis Memory**

```bash
redis-cli info memory
```

3. **Check BullMQ Queue Status**

```bash
redis-cli HGETALL bull:email:repeat
```

4. **Review Slow Queries**

```bash
# In psql
SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

---

## Deployment

### Build for Production

```bash
npm run build
npm run start
```

### Environment Variables for Production

```bash
NODE_ENV=production
DATABASE_URL="postgresql://prod_user:prod_pass@prod_host:5432/devclipboard"
REDIS_URL="redis://prod_redis_host:6379"
JWT_SECRET="<strong-random-key>"
JWT_REFRESH_SECRET="<strong-random-key>"
# ... all other secrets
```

### Monitoring

- Application: PM2, Systemd, Docker
- Logs: ELK Stack, CloudWatch, Datadog
- Metrics: Prometheus, New Relic
- Database: pg_stat_statements, MongoDB profiler
- Cache: Redis monitoring, BullMQ board

---

## Next Steps

1. ✅ Setup complete
2. Start development server: `npm run dev`
3. Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
4. Read [API.md](./API.md) for endpoint documentation
5. Start building features following the module pattern
6. Run tests before committing: `npm test`

---

## Support

- **Issues**: Open an issue on GitHub
- **Discussion**: GitHub Discussions
- **Documentation**: See README.md and other .md files
