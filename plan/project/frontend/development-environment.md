# Development Environment Setup

## 🚀 Quick Start Guide

This guide will help you set up the Discux3 frontend development environment from scratch.

## 📋 Prerequisites

### Required Software
- **Node.js** 20.14.0+ (required for Next.js 14.2.5)
- **npm** 10.0.0+ (comes with Node.js)
- **Git** for version control
- **VS Code** (recommended) with extensions
- **MySQL** 8.0+ (database)
- **Docker** (for Qdrant vector database)

### VS Code Extensions (Recommended)
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json"
  ]
}
```

## 🛠️ Project Initialization

### Step 1: Create Next.js Project
```bash
# Create new Next.js project with specific version
npx create-next-app@14.2.5 discux3 --typescript --tailwind --eslint --app

# Navigate to project directory
cd discux3

# Verify Node.js version (should be 20.14.0+)
node --version
npm --version

# Verify project structure
ls -la
```

### Step 2: Install shadcn/ui
```bash
# Initialize shadcn/ui
npx shadcn-ui@latest init

# Install required shadcn/ui components
npx shadcn-ui@latest add card
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add form
npx shadcn-ui@latest add label
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add scroll-area
npx shadcn-ui@latest add command
```

### Step 3: Install Dependencies with Specific Versions
```bash
# Core dependencies with versions
npm install socket.io-client@4.7.5
npm install react-hook-form@7.52.1
npm install @hookform/resolvers@3.7.0
npm install zod@3.23.8
npm install zustand@4.5.4
npm install lucide-react@0.408.0
npm install clsx@2.1.1
npm install tailwind-merge@2.4.0
npm install class-variance-authority@0.7.0
npm install @radix-ui/react-icons@1.3.0

# Authentication dependencies (NextAuth.js v5)
npm install next-auth@5.0.0-beta.19
npm install @auth/prisma-adapter@1.0.7

# Database dependencies
npm install @prisma/client@5.16.2
npm install -D prisma@5.16.2
npm install qdrant-client@1.8.0

# Date utilities
npm install date-fns@3.6.0

# Additional shadcn/ui dependencies
npm install tailwindcss-animate@1.0.7
npm install cmdk@1.0.0
npm install @radix-ui/react-dialog@1.0.5
npm install @radix-ui/react-dropdown-menu@2.0.6
npm install @radix-ui/react-avatar@1.0.4
npm install @radix-ui/react-label@2.0.2
npm install @radix-ui/react-separator@1.0.3
npm install @radix-ui/react-scroll-area@1.0.5

# Development dependencies
npm install -D @types/node@20.14.11 @types/react@18.3.3 @types/react-dom@18.3.0

# Testing dependencies
npm install -D jest@29.7.0 @testing-library/react@16.0.0 @testing-library/jest-dom@6.4.8 jest-environment-jsdom@29.7.0

# Code formatting
npm install -D prettier@3.3.3 prettier-plugin-tailwindcss@0.6.5
```

### Step 4: Environment Configuration
```bash
# Create environment file
touch .env.local

# Add environment variables
cat > .env.local << EOF
# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Discux3"
NEXT_PUBLIC_APP_VERSION="0.1.0"

# Database (MySQL 8.0+)
DATABASE_URL="mysql://discux_user:discux_password@localhost:3306/discux_db"

# NextAuth.js v5 Configuration
AUTH_URL="http://localhost:3000"
AUTH_SECRET="your-auth-secret-here-32-chars-minimum"
AUTH_TRUST_HOST=true

# Z.ai API (GLM-4.6)
ZAI_API_KEY="your-zai-api-key-here"
ZAI_API_BASE_URL="https://api.z.ai/v1"

# Vector Database (Qdrant)
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY="your-qdrant-key-here"

# Development & Debugging
NEXT_PUBLIC_ENABLE_DEBUG=true
NEXT_PUBLIC_LOG_LEVEL="debug"

# Testing
NEXT_PUBLIC_MOCK_API=false

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=true
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=false
EOF
```

### Step 5: Update package.json Scripts
```bash
# Update package.json with proper scripts
cat > package.json.tmp << 'EOF'
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",

    # Database commands
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "db:reset": "prisma migrate reset"
  }
}
EOF

# Merge scripts into existing package.json (manual step or use jq)
```

## 📁 Project Structure

After setup, your project should look like this:

```
discux3/
├── .env.local
├── .gitignore
├── components.json
├── next.config.js
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── api/auth/[...nextauth]/
│   │   │   └── route.ts
│   │   ├── api/agents/
│   │   ├── api/rooms/
│   │   ├── chat/
│   │   │   └── page.tsx
│   │   ├── agents/
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/ (shadcn/ui components)
│   │   ├── navigation.tsx
│   │   ├── chat/
│   │   │   ├── message-card.tsx
│   │   │   ├── message-input.tsx
│   │   │   └── message-list.tsx
│   │   ├── agents/
│   │   │   ├── agent-card.tsx
│   │   │   ├── create-agent-modal.tsx
│   │   │   └── agent-grid.tsx
│   │   └── shared/
│   │       ├── loading-spinner.tsx
│   │       └── error-boundary.tsx
│   ├── lib/
│   │   ├── utils.ts
│   │   ├── validations.ts
│   │   ├── constants.ts
│   │   ├── auth.ts
│   │   └── socket.ts
│   ├── hooks/
│   │   ├── use-chat.ts
│   │   ├── use-socket.ts
│   │   ├── use-auth.ts
│   │   └── use-local-storage.ts
│   ├── store/
│   │   ├── chat-store.ts
│   │   └── auth-store.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── types/
│       ├── index.ts
│       └── api.ts
├── public/
│   ├── favicon.ico
│   └── icons/
└── README.md
```

## 🔧 Development Commands

### Common Development Tasks
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run type checking
npm run type-check

# Run linting
npm run lint

# Format code
npm run format

# Run tests
npm test

# Storybook (if installed)
npm run storybook
```

### Development Workflow
1. **Start Server**: `npm run dev` (runs on http://localhost:3000)
2. **Open Browser**: Navigate to http://localhost:3000
3. **Hot Reload**: Changes automatically refresh the browser
4. **Type Check**: Run `npm run type-check` in separate terminal
5. **Lint**: Run `npm run lint` before commits

## 🎯 Development Best Practices

### Code Organization
- **Components**: Keep components focused and reusable
- **Types**: Define TypeScript interfaces for all data structures
- **Utilities**: Separate business logic from UI components
- **Constants**: Define magic strings and values in constants

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/chat-interface

# Stage and commit changes
git add .
git commit -m "feat: implement chat message component"

# Push and create PR
git push origin feature/chat-interface
```

### Environment Management
- **Development**: Use `.env.local` for local development
- **Production**: Environment variables set in hosting platform
- **Security**: Never commit `.env.local` or API keys

---

**Related Files:**
- [Frontend Configuration](./configuration.md) - Configuration files and setup
- [Frontend Services](./services.md) - API, Socket.io, testing and deployment