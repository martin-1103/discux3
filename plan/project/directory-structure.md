# Directory Structure Planning

## 📁 Repository Architecture

Discux3 uses **single Next.js 14 application** dengan App Router untuk unified full-stack development experience.

## 🎯 Project Overview

```
discux3/                           # Single Next.js application
├── src/
│   ├── app/                       # Next.js 14 App Router
│   ├── components/                # React components
│   ├── lib/                       # Utilities & configurations
│   ├── hooks/                     # Custom React hooks
│   ├── store/                     # State management
│   └── types/                     # TypeScript types
├── public/                        # Static assets
├── docs/                          # Project documentation
│   └── project/                   # Current documentation
└── package.json                   # Dependencies
```

## 🚀 Web Application Structure

```
discux3/
├── src/
│   ├── app/                          # Next.js 14 App Router
│   │   ├── (auth)/                   # Authentication pages
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── api/auth/[...nextauth]/   # NextAuth.js API routes
│   │   │   └── route.ts
│   │   ├── api/socket/               # Socket.io WebSocket server
│   │   │   └── route.ts
│   │   ├── dashboard/                # Main dashboard
│   │   │   └── page.tsx
│   │   ├── agents/                   # Agent management pages
│   │   │   ├── page.tsx
│   │   │   ├── [id]/                 # Dynamic agent pages
│   │   │   │   └── page.tsx
│   │   │   └── create/
│   │   │       └── page.tsx
│   │   ├── rooms/                    # Chat rooms
│   │   │   ├── page.tsx
│   │   │   ├── [id]/                 # Active room view
│   │   │   │   └── page.tsx
│   │   │   └── create/
│   │   │       └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                  # Home/landing page
│   ├── components/                   # Reusable UI components
│   │   ├── ui/                       # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── modal.tsx
│   │   │   └── index.ts
│   │   ├── agents/                   # Agent-specific components
│   │   │   ├── AgentCard.tsx
│   │   │   ├── AgentForm.tsx
│   │   │   ├── AgentList.tsx
│   │   │   └── AgentTestPanel.tsx
│   │   ├── chat/                     # Chat components
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   ├── AgentMessage.tsx
│   │   │   └── UserMessage.tsx
│   │   ├── rooms/                    # Room management
│   │   │   ├── RoomCard.tsx
│   │   │   ├── RoomSettings.tsx
│   │   │   ├── ParticipantList.tsx
│   │   │   └── InviteModal.tsx
│   │   └── layout/                   # Layout components
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── Footer.tsx
│   ├── hooks/                        # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useSocket.ts
│   │   ├── useAgents.ts
│   │   ├── useRooms.ts
│   │   └── useChat.ts
│   ├── lib/                          # Utilities and configurations
│   │   ├── auth.ts                   # NextAuth.js configuration
│   │   ├── db.ts                     # Prisma client setup
│   │   ├── socket.ts                 # Socket.io client setup
│   │   ├── utils.ts                  # General utilities
│   │   ├── validations.ts            # Zod schemas
│   │   └── constants.ts              # App constants
│   ├── store/                        # Zustand state management
│   │   ├── auth.ts                   # Auth state
│   │   ├── agents.ts                 # Agent state
│   │   ├── rooms.ts                  # Room state
│   │   └── chat.ts                   # Chat state
│   └── types/                        # TypeScript types
│       ├── api/                      # API contract types
│       ├── database/                 # Database entity types
│       └── websocket/                # WebSocket message types
├── prisma/                           # Database schema & migrations
│   ├── schema.prisma                 # Prisma database schema
│   └── migrations/                   # Database migration files
├── public/
│   ├── icons/
│   └── images/
├── .env.local                        # Local environment variables
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

## 📁 Key Files & Directories

### Database Setup (Prisma)
```
discux3/prisma/
├── schema.prisma                    # Prisma database schema
├── migrations/                      # Database migrations
└── seed.ts                          # Optional seed data
```

### Authentication Configuration
```
discux3/src/lib/
├── auth.ts                          # NextAuth.js configuration
├── db.ts                            # Prisma client setup
└── validations.ts                   # Zod validation schemas
```

### TypeScript Types
```
discux3/src/types/
├── api/                             # API contract types
│   ├── auth.ts
│   ├── agents.ts
│   ├── rooms.ts
│   └── chat.ts
├── database/                        # Database entity types
│   ├── user.ts
│   ├── agent.ts
│   ├── room.ts
│   └── message.ts
└── websocket/                       # WebSocket message types
    ├── events.ts
    └── messages.ts
```

## 🔄 Development Workflow

### Authentication Flow
```
User Login → NextAuth.js API Routes → Database (Prisma Adapter) → Session Management
```

### Feature Development Pattern

1. **Database & Schema First**
   - Update Prisma schema in prisma/
   - Run migrations
   - Update types in src/types

2. **Authentication Setup**
   - Configure NextAuth.js in src/lib/auth.ts
   - Update API routes in src/app/api/auth
   - Test authentication flow

3. **Feature Implementation**
   - Create Server Actions di src/lib/actions.ts
   - Add UI components di src/components
   - Connect real-time features dengan Socket.io

4. **Integration Testing**
   - Test end-to-end user flows
   - Validate authentication flow
   - Performance testing for real-time features

### Branch Strategy

```
main/                 # Production-ready code
├── develop/          # Integration branch
├── feature/agent-creation
├── feature/chat-engine
├── feature/room-management
└── hotfix/security-patch
```

## 📋 Key Design Decisions

### Web Application
- **Next.js 14** dengan App Router untuk modern React patterns
- **NextAuth.js** untuk unified authentication dengan email/password provider
- **Zustand** untuk lightweight state management
- **TypeScript** untuk end-to-end type safety
- **Server Actions** untuk direct database access (tanpa API endpoints)

### Database & Authentication
- **Prisma** dengan MySQL untuk type-safe database access
- **NextAuth.js Prisma Adapter** untuk integrated session management
- **Socket.io** untuk real-time WebSocket communication
- **Single application** untuk frontend, backend, dan database

### Integration Benefits
- **Simplified Architecture**: Single Next.js application dengan direct database access
- **Type Safety**: End-to-end TypeScript dari database ke UI
- **Single Deployment**: Vercel deployment untuk seluruh aplikasi
- **Development Simplicity**: Tidak perlu API endpoints untuk CRUD operations
- **Better Performance**: Direct database access tanpa API overhead

## 🚦 Getting Started

### Prerequisites
- **Node.js**: 20.14.0+ (required for Next.js 14.2.5)
- **MySQL**: 8.0+ (for production database)
- **Qdrant**: 1.8.0+ (vector database - Docker recommended)

### Project Setup
```bash
# Initialize project with Next.js 14.2.5
npx create-next-app@14.2.5 discux3 --typescript --tailwind --eslint --app

# Navigate to project
cd discux3

# Install core dependencies with specific versions
npm install next@14.2.5 react@18.3.1 react-dom@18.3.1 typescript@5.5.3

# Install authentication dependencies (NextAuth.js v5)
npm install next-auth@5.0.0-beta.19 @auth/prisma-adapter@1.0.7

# Install database dependencies
npm install @prisma/client@5.16.2 qdrant-client@1.8.0

# Install development dependencies for Prisma
npm install -D prisma@5.16.2

# Install real-time communication dependencies
npm install socket.io@4.7.5 socket.io-client@4.7.5

# Install state management and form handling
npm install zustand@4.5.4 react-hook-form@7.52.1 @hookform/resolvers@3.7.0 zod@3.23.8

# Install UI and styling dependencies
npm install tailwindcss@3.4.6 lucide-react@0.408.0 clsx@2.1.1 tailwind-merge@2.4.0 class-variance-authority@0.7.0 tailwindcss-animate@1.0.7

# Install shadcn/ui components (Radix UI based)
npx shadcn-ui@latest add button input card modal textarea form label avatar dropdown-menu separator scroll-area

# Install development dependencies
npm install -D @types/node@20.14.11 @types/react@18.3.3 @types/react-dom@18.3.0 eslint@8.57.0 eslint-config-next@14.2.5

# Install testing dependencies
npm install -D jest@29.7.0 @testing-library/react@16.0.0 @testing-library/jest-dom@6.4.8 jest-environment-jsdom@29.7.0
```

### Complete package.json Template
```json
{
  "name": "discux3",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "^5.5.3",

    "next-auth": "5.0.0-beta.19",
    "@auth/prisma-adapter": "^1.0.7",

    "@prisma/client": "^5.16.2",
    "qdrant-client": "^1.8.0",

    "socket.io": "^4.7.5",
    "socket.io-client": "^4.7.5",

    "zustand": "^4.5.4",
    "react-hook-form": "^7.52.1",
    "@hookform/resolvers": "^3.7.0",
    "zod": "^3.23.8",

    "tailwindcss": "^3.4.6",
    "lucide-react": "^0.408.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.4.0",
    "class-variance-authority": "^0.7.0",
    "tailwindcss-animate": "^1.0.7",

    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-scroll-area": "^1.0.5",
    "@radix-ui/react-icons": "^1.3.0"
  },
  "devDependencies": {
    "prisma": "^5.16.2",
    "@types/node": "^20.14.11",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "14.2.5",
    "prettier": "^3.3.3",
    "prettier-plugin-tailwindcss": "^0.6.5",
    "jest": "^29.7.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.8",
    "jest-environment-jsdom": "^29.7.0"
  },
  "engines": {
    "node": ">=20.14.0",
    "npm": ">=10.0.0"
  }
}
```

---

**Last Updated**: 2025-01-15
**Version**: 1.0