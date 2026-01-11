# System Architecture Diagrams (Mermaid)

This file contains Mermaid diagrams for the SaaS Starter project. These diagrams can be viewed directly on GitHub, in VS Code with the Mermaid extension, or on https://mermaid.live.

---

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Browser/Client]
        Mobile[Mobile App - Future]
        API_Client[API Client - Future]
    end
    
    subgraph "Next.js Application"
        Middleware[Edge Middleware<br/>JWT Validation, RBAC]
        API_Handler[API Handler Wrapper<br/>Rate Limiting, Validation, Logging]
        
        subgraph "API Routes"
            Auth[Auth Routes<br/>/api/auth/*]
            Stripe_Routes[Stripe Routes<br/>/api/stripe/*]
            Users[User Routes<br/>/api/users/*]
            Admin[Admin Routes<br/>/api/admin/*]
            Features[Feature Flags<br/>/api/feature-flags]
            Sub[Subscription<br/>/api/subscription]
        end
        
        subgraph "Business Logic"
            Auth_Logic[Auth Logic]
            RBAC_Logic[RBAC Logic]
            Stripe_Logic[Stripe Logic]
            Feature_Logic[Feature Flags]
        end
    end
    
    subgraph "Data Layer"
        PostgreSQL[(PostgreSQL<br/>Users, Tokens,<br/>Subscriptions, Flags)]
        Redis[(Redis<br/>Rate Limiting<br/>Caching - Future)]
    end
    
    subgraph "External Services"
        Stripe_API[Stripe API<br/>Checkout, Webhooks]
    end
    
    Browser --> Middleware
    Mobile -.-> Middleware
    API_Client -.-> Middleware
    
    Middleware --> API_Handler
    API_Handler --> Auth
    API_Handler --> Stripe_Routes
    API_Handler --> Users
    API_Handler --> Admin
    API_Handler --> Features
    API_Handler --> Sub
    
    Auth --> Auth_Logic
    Users --> RBAC_Logic
    Stripe_Routes --> Stripe_Logic
    Features --> Feature_Logic
    
    Auth_Logic --> PostgreSQL
    RBAC_Logic --> PostgreSQL
    Feature_Logic --> PostgreSQL
    Stripe_Logic --> Stripe_API
    Stripe_Logic --> PostgreSQL
    
    API_Handler -.-> Redis
    
    style Browser fill:#1565c0,color:#fff
    style Middleware fill:#f57c00,color:#fff
    style API_Handler fill:#7b1fa2,color:#fff
    style PostgreSQL fill:#2e7d32,color:#fff
    style Stripe_API fill:#f9a825,color:#000
    style Redis fill:#c62828,color:#fff
```

---

## 2. Authentication Flow Sequence Diagram

```mermaid
sequenceDiagram
    participant C as Client
    participant M as Middleware
    participant A as API Handler
    participant V as Validator
    participant B as Business Logic
    participant D as Database
    participant J as JWT Service
    participant L as Logger
    
    Note over C,L: User Registration Flow
    C->>A: POST /api/auth/register<br/>{name, email, password}
    A->>A: Rate Limit Check (5/hour)
    A->>V: Validate Input
    V-->>A: Validated Data
    A->>B: Register User
    B->>D: Check Email Uniqueness
    D-->>B: Email Available
    B->>B: Hash Password (bcrypt)
    B->>D: Create User
    D-->>B: User Created
    B->>J: Generate Tokens
    J-->>B: Access + Refresh Tokens
    B->>D: Store Refresh Token
    D-->>B: Token Stored
    B->>L: Log Registration
    B-->>A: User + Tokens
    A-->>C: 201 Created
    
    Note over C,L: User Login Flow
    C->>A: POST /api/auth/login<br/>{email, password}
    A->>A: Rate Limit Check (10/15min)
    A->>V: Validate Input
    V-->>A: Validated Data
    A->>B: Authenticate User
    B->>D: Find User by Email
    D-->>B: User Data
    B->>B: Verify Password (bcrypt)
    B->>J: Generate Tokens
    J-->>B: Access + Refresh Tokens
    B->>D: Store Refresh Token
    D-->>B: Token Stored
    B->>L: Log Login
    B-->>A: User + Tokens
    A-->>C: 200 OK
```

---

## 3. Token Refresh Flow (Security Critical)

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API Handler
    participant V as Validator
    participant J as JWT Service
    participant D as Database
    participant L as Logger
    
    Note over C,L: Token Refresh with Rotation
    C->>A: POST /api/auth/refresh<br/>{refreshToken}
    A->>A: Rate Limit Check (20/min)
    A->>V: Validate Input
    V-->>A: Validated Token
    A->>J: Verify Refresh Token
    J-->>A: Token Valid
    A->>D: Lookup Token in DB
    D-->>A: Token Found & Not Expired
    A->>J: Generate New Access Token
    J-->>A: New Access Token (15min)
    A->>J: Generate New Refresh Token
    J-->>A: New Refresh Token (7 days)
    
    Note over A,D: TOKEN ROTATION (Security)
    A->>D: DELETE Old Refresh Token
    D-->>A: Old Token Deleted
    A->>D: INSERT New Refresh Token
    D-->>A: New Token Stored
    A->>L: Log Token Refresh
    A-->>C: 200 OK<br/>{accessToken, refreshToken}
    
    Note over C,L: If Token Stolen - Can Only Use Once
```

---

## 4. Protected Request Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant M as Middleware
    participant A as API Handler
    participant B as Business Logic
    participant D as Database
    participant L as Logger
    
    Note over C,L: Protected API Request
    C->>M: GET /api/users<br/>Authorization: Bearer <token>
    M->>M: Extract Token from Header
    M->>M: Verify JWT Signature
    M->>M: Check Token Expiration
    M->>D: Verify User Exists
    D-->>M: User Found
    M->>M: Check User Role
    M->>M: Inject Context Headers<br/>(x-user-id, x-user-role)
    M->>A: Forward Request with Context
    A->>A: Rate Limit Check
    A->>A: Extract Auth Context
    A->>B: Execute Handler
    B->>B: requireAdmin(auth)
    B->>D: Query Users with Pagination
    D-->>B: Users Data
    B->>L: Log Request
    B-->>A: Response Data
    A->>L: Log Request Duration
    A-->>M: Response
    M-->>C: 200 OK<br/>{users: [...], pagination}
```

---

## 5. Database Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ REFRESH_TOKEN : "has"
    USER ||--o| SUBSCRIPTION : "has"
    USER ||--o{ USER_FEATURE_FLAG : "has"
    
    USER {
        string id PK "cuid"
        string email UK "unique"
        string password "bcrypt hashed"
        string name "nullable"
        enum role "USER | ADMIN"
        datetime emailVerified "nullable"
        datetime createdAt
        datetime updatedAt
    }
    
    REFRESH_TOKEN {
        string id PK "cuid"
        string token UK "unique, indexed"
        string userId FK "indexed"
        datetime expiresAt
        datetime createdAt
    }
    
    SUBSCRIPTION {
        string id PK "cuid"
        string userId FK "unique"
        string stripeCustomerId UK "indexed"
        string stripeSubscriptionId UK "nullable, indexed"
        string stripePriceId "nullable"
        enum status "ACTIVE | CANCELED | PAST_DUE | TRIALING | INCOMPLETE"
        datetime currentPeriodStart "nullable"
        datetime currentPeriodEnd "nullable"
        boolean cancelAtPeriodEnd
        datetime createdAt
        datetime updatedAt
    }
    
    USER_FEATURE_FLAG {
        string id PK "cuid"
        string userId FK "indexed"
        string flagKey
        boolean enabled
        datetime createdAt
        datetime updatedAt
    }
```

---

## 6. Stripe Integration Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API Handler
    participant B as Business Logic
    participant S as Stripe API
    participant D as Database
    participant W as Webhook Handler
    
    Note over C,W: Checkout Flow
    C->>A: POST /api/stripe/checkout<br/>{planType: "monthly"}
    A->>A: Auth Check
    A->>B: Create Checkout Session
    B->>D: Get or Create Stripe Customer
    D-->>B: Customer ID
    B->>S: Create Checkout Session
    S-->>B: Session URL
    B-->>A: Checkout URL
    A-->>C: 200 OK<br/>{url: "https://checkout.stripe.com/..."}
    C->>S: Redirect to Stripe Checkout
    S-->>C: Payment Form
    
    Note over C,W: Webhook Flow (Async)
    S->>W: POST /api/stripe/webhook<br/>Stripe-Signature: <sig>
    W->>W: Verify Signature
    W->>W: Parse Event
    alt Subscription Created/Updated
        W->>D: Sync Subscription Data
        D-->>W: Updated
    else Subscription Deleted
        W->>D: Update Status to CANCELED
        D-->>W: Updated
    end
    W-->>S: 200 OK
```

---

## 7. Security Layers Architecture

```mermaid
graph TD
    subgraph "Layer 1: Input Validation"
        V1[Zod Schemas]
        V2[Type Safety]
        V3[Password Strength]
    end
    
    subgraph "Layer 2: Authentication"
        A1[JWT Verification]
        A2[Token Expiration]
        A3[Refresh Rotation]
    end
    
    subgraph "Layer 3: Authorization"
        Z1[RBAC Middleware]
        Z2[Role Checks]
        Z3[Route Protection]
    end
    
    subgraph "Layer 4: Rate Limiting"
        R1[IP-based Limits]
        R2[Per-route Config]
        R3[Brute Force Prevention]
    end
    
    subgraph "Layer 5: Error Handling"
        E1[Custom Error Classes]
        E2[No Info Leakage]
        E3[Structured Logging]
    end
    
    Request[Incoming Request] --> V1
    V1 --> A1
    A1 --> Z1
    Z1 --> R1
    R1 --> E1
    E1 --> Response[Response]
    
    style Request fill:#1565c0,color:#fff
    style Response fill:#2e7d32,color:#fff
    style V1 fill:#f9a825,color:#000
    style A1 fill:#e64a19,color:#fff
    style Z1 fill:#c2185b,color:#fff
    style R1 fill:#512da8,color:#fff
    style E1 fill:#00796b,color:#fff
```

---

## 8. API Route Structure

```mermaid
graph LR
    subgraph "Public Routes"
        Register[POST /api/auth/register]
        Login[POST /api/auth/login]
        Webhook[POST /api/stripe/webhook]
    end
    
    subgraph "Authenticated Routes"
        Refresh[POST /api/auth/refresh]
        Logout[POST /api/auth/logout]
        Subscription[GET /api/subscription]
        Features_Get[GET /api/feature-flags]
        User_Get["GET /api/users/:id"]
        User_Update["PATCH /api/users/:id"]
        Checkout[POST /api/stripe/checkout]
        Portal[POST /api/stripe/portal]
    end
    
    subgraph "Admin Routes"
        Users_List[GET /api/users]
        Features_Set[POST /api/feature-flags]
        Admin_Stats[GET /api/admin/stats]
    end
    
    Register --> Auth[Authentication Required]
    Login --> Auth
    Refresh --> Auth
    Logout --> Auth
    Subscription --> Auth
    Features_Get --> Auth
    User_Get --> Auth
    User_Update --> Auth
    Checkout --> Auth
    Portal --> Auth
    
    Users_List --> Admin[Admin Role Required]
    Features_Set --> Admin
    Admin_Stats --> Admin
    
    Webhook --> No_Auth[No Authentication<br/>Signature Verified]
    
    style Register fill:#2e7d32,color:#fff
    style Login fill:#2e7d32,color:#fff
    style Webhook fill:#2e7d32,color:#fff
    style Auth fill:#f9a825,color:#000
    style Admin fill:#e64a19,color:#fff
    style No_Auth fill:#1565c0,color:#fff
```

---

## 9. Scalability Evolution

```mermaid
graph TB
    subgraph "Phase 1: 0-10K Users"
        P1_App[Single Next.js Instance]
        P1_DB[(Single PostgreSQL)]
        P1_Mem[In-Memory Rate Limit]
        P1_Log[Console Logging]
        
        P1_App --> P1_DB
        P1_App --> P1_Mem
        P1_App --> P1_Log
    end
    
    subgraph "Phase 2: 10K-100K Users"
        P2_LB[Load Balancer]
        P2_App1[Next.js Instance 1]
        P2_App2[Next.js Instance 2]
        P2_DB_Primary[(PostgreSQL Primary)]
        P2_DB_Replica[(PostgreSQL Replica)]
        P2_Redis[(Redis Cache)]
        P2_CDN[CDN]
        
        P2_LB --> P2_App1
        P2_LB --> P2_App2
        P2_App1 --> P2_DB_Primary
        P2_App2 --> P2_DB_Primary
        P2_App1 --> P2_DB_Replica
        P2_App2 --> P2_DB_Replica
        P2_App1 --> P2_Redis
        P2_App2 --> P2_Redis
        P2_LB --> P2_CDN
    end
    
    subgraph "Phase 3: 100K-500K Users"
        P3_LB[Load Balancer]
        P3_Apps[Multiple Next.js Instances]
        P3_DB_Primary[(PostgreSQL Primary)]
        P3_DB_Replicas[(3-5 Read Replicas)]
        P3_Redis_Cluster[(Redis Cluster)]
        P3_Queue[Job Queue - Bull/BullMQ]
        P3_Monitor[APM + Monitoring]
        
        P3_LB --> P3_Apps
        P3_Apps --> P3_DB_Primary
        P3_Apps --> P3_DB_Replicas
        P3_Apps --> P3_Redis_Cluster
        P3_Apps --> P3_Queue
        P3_Apps --> P3_Monitor
    end
    
    P1_App -.Migration.-> P2_LB
    P2_LB -.Migration.-> P3_LB
    
    style P1_App fill:#2e7d32,color:#fff
    style P2_LB fill:#f9a825,color:#000
    style P3_LB fill:#e64a19,color:#fff
```

---

## 10. Request Processing Pipeline

```mermaid
flowchart TD
    Start([Incoming Request]) --> Middleware{Edge Middleware}
    
    Middleware -->|No Token| Reject1[401 Unauthorized]
    Middleware -->|Invalid Token| Reject2[401 Unauthorized]
    Middleware -->|Valid Token| Handler[API Handler Wrapper]
    
    Handler --> RateLimit{Rate Limit Check}
    RateLimit -->|Exceeded| Reject3[429 Too Many Requests]
    RateLimit -->|Allowed| AuthCheck{Auth Required?}
    
    AuthCheck -->|No| Validate[Input Validation]
    AuthCheck -->|Yes| ExtractAuth[Extract Auth Context]
    ExtractAuth -->|No Auth| Reject4[401 Unauthorized]
    ExtractAuth -->|Has Auth| Validate
    
    Validate -->|Invalid| Reject5[400 Bad Request]
    Validate -->|Valid| BusinessLogic[Business Logic]
    
    BusinessLogic -->|Error| ErrorHandler[Error Handler]
    BusinessLogic -->|Success| Logger[Request Logger]
    
    ErrorHandler --> Logger
    Logger --> Response([Response])
    
    style Start fill:#1565c0,color:#fff
    style Response fill:#2e7d32,color:#fff
    style Reject1 fill:#c62828,color:#fff
    style Reject2 fill:#c62828,color:#fff
    style Reject3 fill:#c62828,color:#fff
    style Reject4 fill:#c62828,color:#fff
    style Reject5 fill:#c62828,color:#fff
    style Middleware fill:#f9a825,color:#000
    style Handler fill:#7b1fa2,color:#fff
    style BusinessLogic fill:#2e7d32,color:#fff
```

---

## 11. Component Dependency Graph

```mermaid
graph TD
    subgraph "Core Libraries"
        JWT[lib/jwt.ts<br/>Token Generation/Verification]
        AUTH[lib/auth.ts<br/>Server Auth Utilities]
        RBAC[lib/rbac.ts<br/>Role-Based Access Control]
        VALID[lib/validation.ts<br/>Zod Schemas]
        ERRORS[lib/errors.ts<br/>Error Classes]
        LOGGER[lib/logger.ts<br/>Structured Logging]
        RATE[lib/rate-limit.ts<br/>Rate Limiting]
        HANDLER[lib/api-handler.ts<br/>API Wrapper]
    end
    
    subgraph "Business Logic"
        STRIPE[lib/stripe.ts<br/>Stripe Integration]
        FEATURES[lib/feature-flags.ts<br/>Feature Flags]
        PRISMA[lib/prisma.ts<br/>Database Client]
    end
    
    subgraph "API Routes"
        AUTH_ROUTES[app/api/auth/*]
        STRIPE_ROUTES[app/api/stripe/*]
        USER_ROUTES[app/api/users/*]
        ADMIN_ROUTES[app/api/admin/*]
    end
    
    HANDLER --> RATE
    HANDLER --> VALID
    HANDLER --> ERRORS
    HANDLER --> LOGGER
    HANDLER --> AUTH
    
    AUTH --> JWT
    AUTH --> PRISMA
    
    RBAC --> AUTH
    
    AUTH_ROUTES --> HANDLER
    AUTH_ROUTES --> JWT
    AUTH_ROUTES --> PRISMA
    AUTH_ROUTES --> VALID
    
    STRIPE_ROUTES --> HANDLER
    STRIPE_ROUTES --> STRIPE
    STRIPE_ROUTES --> PRISMA
    
    USER_ROUTES --> HANDLER
    USER_ROUTES --> RBAC
    USER_ROUTES --> PRISMA
    USER_ROUTES --> VALID
    
    ADMIN_ROUTES --> HANDLER
    ADMIN_ROUTES --> RBAC
    ADMIN_ROUTES --> PRISMA
    
    STRIPE --> PRISMA
    FEATURES --> PRISMA
    
    style HANDLER fill:#7b1fa2,color:#fff
    style JWT fill:#f9a825,color:#000
    style PRISMA fill:#2e7d32,color:#fff
    style STRIPE fill:#e64a19,color:#fff
```

---

## 12. Data Flow: User Registration

```mermaid
flowchart LR
    Start([Client Request]) --> RL[Rate Limiter<br/>5/hour per IP]
    RL --> V[Zod Validator<br/>name, email, password]
    V --> DB1[(Database<br/>Check Email)]
    DB1 --> BC[bcrypt<br/>Hash Password]
    BC --> DB2[(Database<br/>Create User)]
    DB2 --> JWT[JWT Service<br/>Generate Tokens]
    JWT --> DB3[(Database<br/>Store Refresh Token)]
    DB3 --> LOG[Logger<br/>Log Event]
    LOG --> End([Response<br/>User + Tokens])
    
    style Start fill:#1565c0,color:#fff
    style End fill:#2e7d32,color:#fff
    style RL fill:#f9a825,color:#000
    style V fill:#7b1fa2,color:#fff
    style BC fill:#e64a19,color:#fff
    style JWT fill:#512da8,color:#fff
    style DB1 fill:#2e7d32,color:#fff
    style DB2 fill:#2e7d32,color:#fff
    style DB3 fill:#2e7d32,color:#fff
    style LOG fill:#00796b,color:#fff
```

---

## 13. Feature Flag System

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API Handler
    participant B as Business Logic
    participant F as Feature Flags Service
    participant D as Database
    
    Note over C,D: Get User Feature Flags
    C->>A: GET /api/feature-flags<br/>Authorization: Bearer <token>
    A->>A: Auth Check
    A->>B: Get Feature Flags
    B->>F: getUserFeatureFlags(userId)
    F->>D: SELECT * FROM user_feature_flags<br/>WHERE userId = ?
    D-->>F: Flags Data
    F-->>B: {flagKey: enabled, ...}
    B-->>A: Flags Object
    A-->>C: 200 OK<br/>{flags: {...}}
    
    Note over C,D: Set Feature Flag (Admin Only)
    C->>A: POST /api/feature-flags<br/>{userId, flagKey, enabled}
    A->>A: Auth Check
    A->>A: requireAdmin()
    A->>B: Set Feature Flag
    B->>F: setFeatureFlag(userId, flagKey, enabled)
    F->>D: UPSERT user_feature_flags<br/>SET enabled = ?
    D-->>F: Updated
    F-->>B: Success
    B-->>A: Success
    A-->>C: 200 OK
```

---

## 14. Error Handling Flow

```mermaid
flowchart TD
    Start([Request Processing]) --> Try{Try Block}
    Try -->|Success| Success[Return Response]
    Try -->|Error| Catch{Catch Block}
    
    Catch -->|AppError| AppError[Custom Error Class]
    Catch -->|ZodError| ZodError[Validation Error]
    Catch -->|Unknown Error| Unknown[Unknown Error]
    
    AppError --> ErrorHandler[Error Handler]
    ZodError --> ErrorHandler
    Unknown --> Logger[Logger<br/>Log Error Details]
    Logger --> ErrorHandler
    
    ErrorHandler -->|400| BadRequest[400 Bad Request<br/>Validation Error]
    ErrorHandler -->|401| Unauthorized[401 Unauthorized<br/>Auth Error]
    ErrorHandler -->|403| Forbidden[403 Forbidden<br/>Permission Error]
    ErrorHandler -->|404| NotFound[404 Not Found]
    ErrorHandler -->|429| RateLimit[429 Too Many Requests]
    ErrorHandler -->|500| ServerError[500 Internal Error<br/>No Details Exposed]
    
    BadRequest --> Response([Response])
    Unauthorized --> Response
    Forbidden --> Response
    NotFound --> Response
    RateLimit --> Response
    ServerError --> Response
    Success --> Response
    
    style Start fill:#1565c0,color:#fff
    style Response fill:#2e7d32,color:#fff
    style BadRequest fill:#f9a825,color:#000
    style Unauthorized fill:#e64a19,color:#fff
    style Forbidden fill:#e64a19,color:#fff
    style ServerError fill:#c62828,color:#fff
```

---

## 15. Complete System Overview

```mermaid
graph TB
    subgraph "Frontend"
        UI[React Components<br/>Pages & Forms]
    end
    
    subgraph "Next.js Application"
        MW[Middleware<br/>Auth & RBAC]
        API[API Routes<br/>Business Logic]
        LIB[Utility Libraries<br/>JWT, Validation, etc.]
    end
    
    subgraph "Data Persistence"
        PG[(PostgreSQL<br/>Users, Tokens,<br/>Subscriptions)]
    end
    
    subgraph "External Services"
        STRIPE[Stripe API<br/>Payments & Webhooks]
    end
    
    subgraph "Infrastructure - Future"
        REDIS[(Redis<br/>Caching & Rate Limiting)]
        QUEUE[Job Queue<br/>Background Processing]
        MONITOR[Monitoring<br/>APM & Logging]
    end
    
    UI --> MW
    MW --> API
    API --> LIB
    LIB --> PG
    API --> STRIPE
    API -.-> REDIS
    API -.-> QUEUE
    API -.-> MONITOR
    
    style UI fill:#1565c0,color:#fff
    style MW fill:#f57c00,color:#fff
    style API fill:#7b1fa2,color:#fff
    style PG fill:#2e7d32,color:#fff
    style STRIPE fill:#f9a825,color:#000
    style REDIS fill:#c62828,color:#fff
    style QUEUE fill:#c2185b,color:#fff
    style MONITOR fill:#00796b,color:#fff
```

---

## Usage Instructions

### Viewing These Diagrams

1. **GitHub**: These diagrams render automatically in GitHub markdown files
2. **VS Code**: Install "Markdown Preview Mermaid Support" extension
3. **Online**: Copy code to https://mermaid.live
4. **Documentation**: Include in technical docs, presentations, or README

### Adding to README

Copy any diagram code block into your README.md file. GitHub will automatically render it.

### Exporting

- **PNG/SVG**: Use Mermaid Live Editor to export
- **PDF**: Use Mermaid CLI: `mmdc -i diagram.mmd -o diagram.pdf`

---

## Diagram Index

1. **High-Level System Architecture** - Overall system structure
2. **Authentication Flow** - Registration and login sequences
3. **Token Refresh Flow** - Security-critical token rotation
4. **Protected Request Flow** - How authenticated requests work
5. **Database ERD** - Entity relationships
6. **Stripe Integration** - Payment and webhook flows
7. **Security Layers** - Defense-in-depth architecture
8. **API Route Structure** - Route organization and protection
9. **Scalability Evolution** - Growth from 0 to 1M users
10. **Request Processing Pipeline** - Request flow with error handling
11. **Component Dependencies** - Library and component relationships
12. **Data Flow: Registration** - Step-by-step registration process
13. **Feature Flag System** - Feature flag management flow
14. **Error Handling Flow** - Error processing and responses
15. **Complete System Overview** - Full system with future infrastructure

---

All diagrams are production-ready and can be used in documentation, presentations, or architecture reviews.

