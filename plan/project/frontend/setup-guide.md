# Development Environment Setup Guide

## 🔧 Complete Setup Instructions untuk Discux3

Guide ini menyediakan step-by-step instructions untuk setup development environment Discux3 dengan dependency versions yang spesifik dan compatibility terjamin.

## 📋 Prerequisites Check

### System Requirements
- **Node.js**: 20.14.0+ (required for Next.js 14.2.5)
- **npm**: 10.0.0+ (comes with Node.js 20+)
- **Git**: 2.30.0+ untuk version control
- **MySQL**: 8.0.35+ (recommended: MySQL 8.0.35 atau MySQL Community Server)
- **Docker**: 4.25.0+ (untuk Qdrant vector database)
- **OS**: Windows 10+, macOS 12+, atau Ubuntu 20.04+

### Verify Prerequisites
```bash
# Check Node.js dan npm versions
node --version  # Should be v20.14.0+
npm --version   # Should be 10.0.0+

# Check Git
git --version

# Check Docker
docker --version
docker-compose --version

# Check MySQL (jika installed locally)
mysql --version
```

## 🚀 Step-by-Step Setup

### Phase 1: Environment Preparation

#### 1.1 Install Qdrant via Docker
```bash
# Pull Qdrant image
docker pull qdrant/qdrant:v1.8.0

# Run Qdrant container
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant:v1.8.0

# Verify Qdrant is running
curl http://localhost:6333/health
```

#### 1.2 Setup MySQL Database
```bash
# Option A: Install MySQL 8.0+ locally
# Windows: Download MySQL Community Server 8.0.35+
# macOS: brew install mysql@8.0
# Ubuntu: sudo apt update && sudo apt install mysql-server-8.0

# Option B: Use Docker for MySQL
docker run -d \
  --name mysql-discux3 \
  -e MYSQL_ROOT_PASSWORD=rootpassword \
  -e MYSQL_DATABASE=discux_db \
  -e MYSQL_USER=discux_user \
  -e MYSQL_PASSWORD=discux_password \
  -p 3306:3306 \
  mysql:8.0.35

# Create database manual jika tidak menggunakan Docker
mysql -u root -p
CREATE DATABASE discux_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'discux_user'@'localhost' IDENTIFIED BY 'discux_password';
GRANT ALL PRIVILEGES ON discux_db.* TO 'discux_user'@'localhost';
FLUSH PRIVILEGES;
```

### Phase 2: Project Initialization

#### 2.1 Create Next.js Project
```bash
# Create project dengan Next.js 14.2.5
npx create-next-app@14.2.5 discux3 --typescript --tailwind --eslint --app

# Navigate ke project directory
cd discux3

# Verify project structure
ls -la
```

#### 2.2 Install Dependencies dengan Exact Versions
```bash
# Core dependencies
npm install next@14.2.5 react@18.3.1 react-dom@18.3.1 typescript@5.5.3

# Authentication (NextAuth.js v5)
npm install next-auth@5.0.0-beta.19 @auth/prisma-adapter@1.0.7

# Database
npm install @prisma/client@5.16.2 qdrant-client@1.8.0

# Real-time communication
npm install socket.io@4.7.5 socket.io-client@4.7.5

# State management dan forms
npm install zustand@4.5.4 react-hook-form@7.52.1 @hookform/resolvers@3.7.0 zod@3.23.8

# UI dan styling
npm install tailwindcss@3.4.6 lucide-react@0.408.0 clsx@2.1.1 tailwind-merge@2.4.0
npm install class-variance-authority@0.7.0 tailwindcss-animate@1.0.7

# Radix UI components (shadcn/ui dependencies)
npm install @radix-ui/react-dialog@1.0.5 @radix-ui/react-dropdown-menu@2.0.6
npm install @radix-ui/react-avatar@1.0.4 @radix-ui/react-label@2.0.2
npm install @radix-ui/react-separator@1.0.3 @radix-ui/react-scroll-area@1.0.5
npm install @radix-ui/react-icons@1.3.0

# Additional utilities
npm install date-fns@3.6.0 cmdk@1.0.0

# Development dependencies
npm install -D prisma@5.16.2 @types/node@20.14.11 @types/react@18.3.3 @types/react-dom@18.3.0
npm install -D eslint@8.57.0 eslint-config-next@14.2.5
npm install -D prettier@3.3.3 prettier-plugin-tailwindcss@0.6.5

# Testing dependencies
npm install -D jest@29.7.0 @testing-library/react@16.0.0 @testing-library/jest-dom@6.4.8
npm install -D jest-environment-jsdom@29.7.0
```

#### 2.3 Setup shadcn/ui
```bash
# Initialize shadcn/ui
npx shadcn-ui@latest init

# Install required components
npx shadcn-ui@latest add button input card modal textarea form label
npx shadcn-ui@latest add avatar dropdown-menu separator scroll-area
npx shadcn-ui@latest add badge tooltip command
```

### Phase 3: Configuration Setup

#### 3.1 Environment Variables (.env.local)
```bash
# Create .env.local file
cat > .env.local << 'EOF'
# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Discux3"
NEXT_PUBLIC_APP_VERSION="0.1.0"

# Database (MySQL 8.0+)
DATABASE_URL="mysql://discux_user:discux_password@localhost:3306/discux_db"

# NextAuth.js v5 Configuration
AUTH_URL="http://localhost:3000"
AUTH_SECRET="your-auth-secret-minimum-32-characters-long"
AUTH_TRUST_HOST=true

# Z.ai API (GLM-4.6)
ZAI_API_KEY="your-zai-api-key-here"
ZAI_API_BASE_URL="https://api.z.ai/v1"

# Vector Database (Qdrant)
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY="" # Kosongkan jika tidak menggunakan API key

# Development & Debugging
NEXT_PUBLIC_ENABLE_DEBUG=true
NEXT_PUBLIC_LOG_LEVEL="debug"

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=true
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=false
EOF
```

#### 3.2 Update package.json Scripts
```bash
# Backup original package.json
cp package.json package.json.backup

# Update scripts menggunakan jq atau edit manual
cat > scripts.json << 'EOF'
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
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "db:reset": "prisma migrate reset"
  },
  "engines": {
    "node": ">=20.14.0",
    "npm": ">=10.0.0"
  }
}
EOF

# Merge scripts ke package.json (manual edit recommended)
```

#### 3.3 Configuration Files

**next.config.ts**
```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
  },
}

export default nextConfig
```

**prettier.config.js**
```javascript
module.exports = {
  plugins: [require('prettier-plugin-tailwindcss')],
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 80,
  tabWidth: 2,
}
```

**jest.config.js**
```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/pages/(.*)$': '<rootDir>/src/pages/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
}

module.exports = createJestConfig(customJestConfig)
```

**jest.setup.js**
```javascript
import '@testing-library/jest-dom'
```

### Phase 4: Database Setup

#### 4.1 Initialize Prisma
```bash
# Initialize Prisma
npx prisma init

# Create basic schema (prisma/schema.prisma)
cat > prisma/schema.prisma << 'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  accounts   Account[]
  sessions   Session[]
  agents     Agent[]
  rooms      RoomUser[]
  messages   Message[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
EOF

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

### Phase 5: Testing Setup

#### 5.1 Verify Setup
```bash
# Check Node.js compatibility
npm --version
node --version

# Install all dependencies
npm install

# Check for vulnerabilities
npm audit

# Run type checking
npm run type-check

# Run linting
npm run lint

# Run tests
npm test

# Try building
npm run build

# Start development server
npm run dev
```

#### 5.2 Verify Services
```bash
# Check Qdrant
curl http://localhost:6333/collections

# Check MySQL connection
npm run db:studio # Buka browser ke http://localhost:5555

# Test development server
curl http://localhost:3000
```

## 🎯 Development Workflow

### Daily Development Commands
```bash
# Start development server
npm run dev

# Run type checking di terminal terpisah
npm run type-check

# Run tests saat development
npm run test:watch

# Format code sebelum commit
npm run format

# Lint check
npm run lint

# Database operations
npm run db:migrate  # Setiap schema change
npm run db:studio   # Database GUI
```

### Git Setup
```bash
# Initialize git repository
git init

# Create .gitignore
cat > .gitignore << 'EOF'
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# prisma
/prisma/migrations
EOF

# Initial commit
git add .
git commit -m "Initial commit: Setup Discux3 development environment"
```

## 🔧 Troubleshooting

### Common Issues

#### Node.js Version Issues
```bash
# Jika Node.js version tidak compatible
nvm install 20.14.0
nvm use 20.14.0
```

#### Port Conflicts
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 6333 (Qdrant)
docker rm -f qdrant
```

#### Database Connection Issues
```bash
# Test MySQL connection
mysql -u discux_user -p discux_db

# Test Qdrant connection
curl http://localhost:6333/health
```

#### Permission Issues
```bash
# Fix npm permissions (macOS/Linux)
sudo chown -R $(whoami) ~/.npm

# Fix Docker permissions (Linux)
sudo usermod -aG docker $USER
```

### Performance Tips

#### Development Optimization
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Use Next.js standalone mode untuk build
npm run build
```

## 📚 Additional Resources

### Documentation Links
- [Next.js 14.2.5 Documentation](https://nextjs.org/docs/14)
- [NextAuth.js v5 Documentation](https://authjs.dev/)
- [Prisma 5.16.2 Documentation](https://www.prisma.io/docs/5.16.2)
- [shadcn/ui Documentation](https://ui.shadcn.com/)

### VS Code Extensions
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "prisma.prisma",
    "ms-vscode.vscode-json",
    "formulahendry.auto-rename-tag"
  ]
}
```

---

**Last Updated**: 2025-01-15
**Version**: 1.0
**Compatibility**: Node.js 20.14.0+, Next.js 14.2.5, React 18.3.1