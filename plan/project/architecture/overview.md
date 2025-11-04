# Architecture Overview

## 🏗️ System Overview

Discux3 menggunakan modern single Next.js 14 application dengan App Router yang menggabungkan frontend dan backend dalam satu aplikasi terpadu. System dirancang untuk simplicity, real-time performance, dan maintainability.

## 🎯 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   Discux3 Next.js App                          │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │   Frontend      │    │ Server Actions  │                    │
│  │                 │    │                 │                    │
│  │ React +         │    │ Direct DB +     │                    │
│  │ shadcn/ui       │◄──►│ WebSocket       │                    │
│  │                 │    │                 │                    │
│  │ - Chat UI       │    │ - Server Actions │                    │
│  │ - Agent Mgmt    │    │ - Socket.io      │                    │
│  │ - Real-time     │    │ - AI Integration │                    │
│  └─────────────────┘    └─────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                        ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
                        │   Primary DB    │    │  Vector DB      │    │   External      │
                        │                 │    │                 │    │   Services      │
                        │     MySQL       │◄──►│     Qdrant      │◄──►│ Z.ai API (GLM-4.6)│
                        │                 │    │                 │    │                 │
                        │ - Users         │    │ - Agent Memory  │    │ - AI Generation │
                        │ - Agents        │    │ - Message Vectors│    │ - Agent Responses│
                        │ - Rooms         │    │ - Semantic Search│    │                 │
                        │ - Messages      │    │ - Knowledge Base│    └─────────────────┘
                        │ - Relations     │    │                 │
                        └─────────────────┘    └─────────────────┘
```

## 🛠️ Technology Stack

### Frontend Stack
- **Framework**: Next.js 14.2.5 dengan App Router
- **UI Components**: shadcn/ui v2.0+ (modern, accessible Radix UI based components)
- **Styling**: Tailwind CSS 3.4.6 untuk rapid development
- **Real-time**: WebSocket integration (Socket.io-client 4.7.5)
- **State Management**: React Context + Zustand 4.5.4 untuk complex state
- **Forms**: React Hook Form 7.52.1 dengan Zod 3.23.8 validation
- **Icons**: Lucide React 0.408.0
- **TypeScript**: 5.5.3 Full type safety
- **Build Tool**: Turbopack (Next.js 14.2.5)

### Backend Stack (Integrated in Next.js)
- **Runtime**: Node.js 20.14.0+ (Next.js runtime)
- **Framework**: Next.js 14.2.5 API Routes (built-in)
- **Real-time**: Socket.io 4.7.5 untuk WebSocket connections
- **Database**: MySQL 8.0+ untuk structured data integrity
- **ORM**: Prisma 5.16.2 untuk type-safe database access
- **Vector Database**: Qdrant 1.8.0+ untuk semantic search & agent memory
- **Authentication**: NextAuth.js 5.0.0-beta.19 (seamless Next.js integration)
- **Validation**: Zod 3.23.8 untuk runtime validation
- **AI Integration**: Z.ai API (GLM-4.6 model)

### Infrastructure & DevOps
- **Package Manager**: npm 10.0.0+ (Next.js default)
- **Linting**: ESLint 8.57.0 + Prettier 3.3.3
- **Testing**: Jest 29.7.0 + Testing Library 16.0.0
- **Git Hooks**: Husky untuk pre-commit checks (optional)
- **Environment**: dotenv untuk configuration management
- **Containerization**: Docker (recommended untuk Qdrant)
- **Hosting**: Vercel (Full-stack Next.js application)
- **Database**: MySQL 8.0+ hosting + Qdrant 1.8.0+ cloud/self-hosted
- **Migration**: Database migration scripts with Prisma 5.16.2 version control

## 📊 Component Relationships

### Data Flow Architecture
1. **User Interaction** → Frontend Components (React)
2. **Real-time Communication** → WebSocket (Socket.io dalam Next.js)
3. **Business Logic** → Next.js API Routes
4. **Data Persistence** → MySQL (structured) + Qdrant (vectors)
5. **AI Processing** → Z.ai API + Vector Search
6. **Response Delivery** → Real-time WebSocket + HTTP Response

### Key Architectural Principles
- **Single Application Architecture**: Unified development dengan direct database access
- **Simplicity**: No unnecessary API layers, direct data flow
- **Real-time First**: WebSocket-based communication untuk instant user experience
- **Type Safety**: End-to-end TypeScript untuk reliability
- **Performance**: Direct database access dan optimized queries
- **Security**: Authentication, authorization, dan input validation di setiap layer

### Integration Points
- **Frontend ↔ Database**: React components ↔ Direct database access (Server Actions)
- **Server Actions ↔ Database**: Prisma ↔ MySQL + Qdrant
- **WebSocket ↔ External Services**: Socket.io ↔ Z.ai API integration
- **Authentication**: NextAuth.js integration untuk session management
- **Real-time Communication**: Socket.io WebSocket server dalam Next.js

---

**Related Files:**
- [Database Schema](./database-schema.md) - Complete MySQL database design
- [API Design](./api-design.md) - REST and WebSocket API specifications
- [AI Integration](./ai-integration.md) - AI services and agent logic
- [Vector Database](./vector-database.md) - Qdrant integration and semantic search
- [Performance Optimization](./performance-optimization.md) - Performance strategies and monitoring
- [Migration & Deployment](./migration-deployment.md) - Database migration and deployment setup