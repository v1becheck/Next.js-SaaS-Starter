# Production SaaS Starter

A production-ready SaaS starter template built with Next.js App Router, TypeScript, PostgreSQL, and Stripe. Designed to scale to 1M+ users.

## Features

- ✅ **JWT Authentication** - Custom JWT implementation with access & refresh tokens (NOT cookie-based)
- ✅ **Role-Based Access Control** - User and Admin roles with middleware protection
- ✅ **Stripe Billing** - Monthly and yearly subscription plans with webhook integration
- ✅ **Feature Flags** - Per-user feature flag system
- ✅ **API Rate Limiting** - In-memory rate limiting (Redis-ready for scale)
- ✅ **Input Validation** - Comprehensive Zod validation schemas
- ✅ **Error Handling** - Production-grade error handling with custom error classes
- ✅ **Logging** - Structured logging utility
- ✅ **PostgreSQL** - Production database with Prisma ORM
- ✅ **Type Safety** - Full TypeScript coverage
- ✅ **Clean Architecture** - Clear separation of concerns

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Custom JWT with refresh tokens
- **Billing**: Stripe subscriptions
- **Validation**: Zod
- **Styling**: Tailwind CSS (minimal)

## Architecture

### System Architecture

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ HTTP/HTTPS
       │
┌──────▼─────────────────────────────────────┐
│         Next.js App Router                 │
│  ┌──────────────────────────────────────┐  │
│  │      Middleware (Auth/RBAC)          │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │      API Routes                      │  │
│  │  - Rate Limiting                     │  │
│  │  - Validation                        │  │
│  │  - Error Handling                    │  │
│  └──────────────────────────────────────┘  │
└──────┬─────────────────────────────────────┘
       │
       ├──────────────┬──────────────┬──────────────┐
       │              │              │              │
┌──────▼──────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
│ PostgreSQL  │ │  Stripe   │ │  Redis    │ │  Logger   │
│  Database   │ │   API     │ │  (Future) │ │  Service  │
└─────────────┘ └───────────┘ └───────────┘ └───────────┘
```

### Folder Structure

```
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/               # Authentication endpoints
│   │   ├── stripe/             # Stripe integration
│   │   ├── subscription/       # Subscription management
│   │   ├── feature-flags/      # Feature flags
│   │   ├── users/              # User management (example)
│   │   └── admin/              # Admin endpoints (example)
│   ├── auth/                   # Auth pages
│   └── dashboard/              # Protected dashboard
├── components/                 # React components
├── lib/                        # Core utilities
│   ├── auth.ts                 # Server-side auth
│   ├── auth-client.ts          # Client-side auth
│   ├── jwt.ts                  # JWT utilities
│   ├── rbac.ts                 # Role-based access control
│   ├── stripe.ts               # Stripe integration
│   ├── feature-flags.ts        # Feature flags
│   ├── rate-limit.ts           # Rate limiting
│   ├── validation.ts           # Zod schemas
│   ├── errors.ts               # Error classes
│   ├── logger.ts               # Logging utility
│   ├── api-handler.ts          # API route wrapper
│   └── prisma.ts               # Prisma client
├── middleware.ts               # Next.js middleware
└── prisma/
    └── schema.prisma           # Database schema
```

### Key Architectural Decisions

#### 1. Custom JWT Authentication (Not NextAuth)
- **Why**: Full control over token lifecycle, refresh token rotation, and security policies
- **Tradeoff**: More code to maintain vs. using NextAuth
- **Benefit**: Better suited for high-scale applications with custom requirements

#### 2. Refresh Token Rotation
- **Why**: Security best practice - prevents token reuse attacks
- **How**: On each refresh, old token is deleted and new one is issued
- **Benefit**: Even if a refresh token is stolen, it can only be used once

#### 3. Middleware-Based RBAC
- **Why**: Fast auth checks at the edge before hitting API routes
- **Tradeoff**: Less flexible than per-route checks
- **Benefit**: Consistent protection across all routes

#### 4. Centralized Validation
- **Why**: Reusable schemas, consistent validation rules
- **Tradeoff**: Less flexibility than inline schemas
- **Benefit**: Single source of truth for validation rules

#### 5. Error Handling Wrapper
- **Why**: Consistent error responses, automatic logging
- **Tradeoff**: Slight abstraction overhead
- **Benefit**: DRY principle, easier to maintain

## Authentication Flow

### Registration Flow

```
1. Client → POST /api/auth/register
   ├─ Rate limiting check (5/hour per IP)
   ├─ Input validation (Zod)
   ├─ Check email uniqueness
   ├─ Hash password (bcrypt)
   └─ Create user in database

2. Generate tokens
   ├─ Access token (15min expiry)
   └─ Refresh token (7 days expiry)

3. Store refresh token in database
   └─ Allows revocation and rotation

4. Return tokens to client
   └─ Client stores in localStorage
```

### Login Flow

```
1. Client → POST /api/auth/login
   ├─ Rate limiting check (10/15min per IP)
   ├─ Input validation
   ├─ Find user by email
   └─ Verify password (bcrypt.compare)

2. Generate tokens (same as registration)

3. Store refresh token in database

4. Return tokens to client
```

### Token Refresh Flow

```
1. Client → POST /api/auth/refresh
   ├─ Verify refresh token (JWT + DB check)
   ├─ Check token not expired
   └─ Verify token exists in database

2. Token Rotation (Security)
   ├─ Delete old refresh token
   └─ Generate new access + refresh tokens

3. Store new refresh token

4. Return new tokens to client
```

### Access Token Usage

```
1. Client includes token in Authorization header
   Header: Authorization: Bearer <access_token>

2. Middleware validates token
   ├─ Verify JWT signature
   ├─ Check expiration
   └─ Verify user exists in DB

3. If valid, add user context to request
   Headers: x-user-id, x-user-role

4. API route uses user context
   └─ No additional DB lookup needed
```

### Logout Flow

```
1. Client → POST /api/auth/logout
   ├─ Require authentication
   └─ Delete refresh token from database

2. Client clears localStorage
   └─ Access token becomes invalid on expiry
```

## Scaling Strategy to 1M Users

### Phase 1: 0-10K Users (Current Setup)

**Infrastructure:**
- Single Next.js server (Vercel/Railway)
- Single PostgreSQL database
- In-memory rate limiting
- Console logging

**Optimizations:**
- ✅ Database indexes on frequently queried fields
- ✅ Connection pooling (Prisma handles this)
- ✅ Efficient queries (select only needed fields)

### Phase 2: 10K-100K Users

**Infrastructure Changes:**
1. **Database Scaling**
   - Add read replicas for read-heavy operations
   - Connection pooling (PgBouncer)
   - Database query optimization

2. **Caching Layer**
   - Replace in-memory rate limiting with Redis
   - Cache user sessions (optional)
   - Cache frequently accessed data

3. **CDN & Static Assets**
   - Use Vercel CDN or Cloudflare
   - Optimize images and static files

**Code Changes:**
```typescript
// lib/rate-limit.ts - Switch to Redis
import Redis from 'ioredis'
const redis = new Redis(process.env.REDIS_URL)

export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
) {
  const key = `ratelimit:${identifier}`
  // Use Redis INCR with TTL
}
```

### Phase 3: 100K-500K Users

**Infrastructure Changes:**
1. **Horizontal Scaling**
   - Multiple Next.js instances (load balanced)
   - Database read replicas (2-3)
   - Redis cluster for distributed caching

2. **Background Jobs**
   - Queue system (Bull/BullMQ with Redis)
   - Process webhooks asynchronously
   - Email sending queue

3. **Monitoring & Observability**
   - APM tool (Datadog, New Relic)
   - Error tracking (Sentry)
   - Structured logging (CloudWatch, LogDNA)

**Code Changes:**
```typescript
// lib/logger.ts - Structured logging
import winston from 'winston'
export const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log' }),
  ],
})
```

### Phase 4: 500K-1M Users

**Infrastructure Changes:**
1. **Database Optimization**
   - Partition large tables (e.g., refresh_tokens by date)
   - Archive old data
   - Consider read-only replicas (4-5)

2. **Microservices (Optional)**
   - Extract auth service
   - Extract billing service
   - API gateway for routing

3. **Advanced Caching**
   - Cache user permissions
   - Cache subscription status
   - Cache feature flags

4. **Performance Monitoring**
   - Database query monitoring
   - Slow query logging
   - Connection pool monitoring

**Code Changes:**
```typescript
// Database partitioning example
// Partition refresh_tokens by month
CREATE TABLE refresh_tokens_2024_01 PARTITION OF refresh_tokens
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### Key Scaling Principles

1. **Database First**
   - Indexes on all foreign keys
   - Composite indexes for common queries
   - Regular VACUUM and ANALYZE

2. **Cache Aggressively**
   - User data (TTL: 5-15 minutes)
   - Subscription status (TTL: 1-5 minutes)
   - Feature flags (TTL: 1 hour)

3. **Async Processing**
   - Webhooks → Queue → Worker
   - Email sending → Queue
   - Analytics → Queue

4. **Monitor Everything**
   - Request latency (p50, p95, p99)
   - Database query times
   - Error rates
   - Rate limit hits

5. **Graceful Degradation**
   - If Redis is down, fall back to in-memory
   - If DB replica is slow, use primary
   - Circuit breakers for external services

### Estimated Costs (1M Users)

**Assumptions:**
- 10% active users (100K daily active)
- 100 requests/user/day average
- 10M requests/day total

**Infrastructure:**
- Next.js hosting (Vercel Pro): $20/month
- PostgreSQL (managed, e.g., Supabase/Neon): $200-500/month
- Redis (managed, e.g., Upstash): $50-200/month
- Stripe: 2.9% + $0.30 per transaction
- Monitoring: $50-100/month

**Total: ~$400-900/month + transaction fees**

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Stripe account (for billing)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd saas-starter
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/saas_starter?schema=public"

# JWT Secrets (generate with: openssl rand -base64 32)
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_MONTHLY_PRICE_ID="price_..."
STRIPE_YEARLY_PRICE_ID="price_..."

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

4. Set up the database:
```bash
npx prisma db push
```

5. (Optional) Seed the database:
```bash
npm run db:seed
```

This creates:
- Admin user: `admin@example.com` / `admin123`
- Regular user: `user@example.com` / `user123`

6. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Revoke refresh token

### Billing

- `POST /api/stripe/checkout` - Create checkout session (requires auth)
- `POST /api/stripe/portal` - Create portal session (requires auth)
- `POST /api/stripe/webhook` - Stripe webhook handler (no auth)
- `GET /api/subscription` - Get user subscription (requires auth)

### Feature Flags

- `GET /api/feature-flags` - Get user's feature flags (requires auth)
- `POST /api/feature-flags` - Set feature flag (requires admin)

### Example Routes

- `GET /api/users` - List users (admin only)
- `GET /api/users/[id]` - Get user by ID
- `PATCH /api/users/[id]` - Update user
- `GET /api/admin/stats` - Get platform stats (admin only)

## Security Considerations

- **Password Hashing**: bcrypt with cost factor 10
- **JWT Secrets**: Separate secrets for access and refresh tokens
- **Token Expiration**: Short-lived access tokens (15min) reduce attack window
- **Token Rotation**: Refresh tokens rotated on each use
- **Input Validation**: Zod validation on all API endpoints
- **SQL Injection**: Protected via Prisma
- **Rate Limiting**: Prevents brute force attacks
- **Webhook Verification**: Stripe webhooks verified with signature
- **CORS**: Configured for production domains only

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:push` - Push Prisma schema to database
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed the database

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
