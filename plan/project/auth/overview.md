# Authentication Overview

## 🎯 Authentication Strategy

Discux3 uses **NextAuth.js** dengan **Prisma adapter** untuk unified authentication dalam single Next.js application. Ini menyediakan seamless authentication experience dengan email/password provider.

## 🔄 Authentication Flow

```
User Input → NextAuth.js API Routes → Prisma Adapter → Database → Session Management
```

### Flow Details:
1. **Login/Register**: User memasukkan email/password
2. **Validation**: NextAuth.js validates credentials dengan database
3. **Session Creation**: JWT session dibuat dan stored dalam database
4. **Access Control**: Protected routes memerlukan valid session
5. **Real-time**: Socket.io connections menggunakan session data

## 🛠️ Implementation Architecture

### Location in Single Next.js App
```
discux3/
├── src/app/api/auth/[...nextauth]/           # NextAuth.js API routes
├── src/lib/auth.ts                            # Auth configuration
├── prisma/schema.prisma                       # Database schema
└── src/types/auth.ts                          # Auth types
```

### Core Components

#### 1. NextAuth.js Configuration
```typescript
// src/lib/auth.ts
import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./db"

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (credentials) => {
        // Custom validation logic
        const user = await prisma.user.findUnique({
          where: { email: credentials?.email as string }
        })

        if (!user) return null

        // Add password verification logic here
        return user
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login",
    signUp: "/register"
  }
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

#### 2. API Routes Setup
```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handler } from "@/lib/auth"

export { handler as GET, handler as POST }
```

#### 3. Database Schema Integration
```prisma
// prisma/schema.prisma
model Account {
  id                 String  @id @default(cuid())
  userId             String
  type               String
  provider           String
  providerAccountId  String
  refresh_token      String? @db.Text
  access_token       String? @db.Text
  expires_at         Int?
  token_type         String?
  scope              String?
  id_token           String? @db.Text
  session_state      String?

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

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?

  // Discux3 specific fields
  avatar_url           String?
  subscription         Enum subscription @default(FREE)
  max_agents           Int       @default(3)
  max_rooms            Int       @default(1)
  max_messages_per_month Int     @default(100)
  last_active          DateTime  @default(now()) @updatedAt(now())

  // Relations
  accounts      Account[]
  sessions      Session[]
  agents        Agent[]
  rooms         Room[]
  roomParticipants RoomParticipant[]
  invitations   RoomInvitation[]
}

// Enums
enum AgentStyle {
  PROFESSIONAL
  DIRECT
  FRIENDLY
  CREATIVE
  ANALYTICAL
}

enum Subscription {
  FREE
  PRO
  TEAM
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

## 🔒 Security Features

### Built-in Security
- **Password Hashing**: Secure password storage dengan bcrypt
- **CSRF Protection**: Built-in CSRF tokens
- **Session Security**: Secure JWT session management
- **Rate Limiting**: Protection against brute force attacks

### Custom Security
- **Input Validation**: Zod schema validation untuk user input
- **Environment Variables**: Secure configuration management
- **Database Security**: Prisma connection pooling dan query validation

## 🔧 Configuration

### Environment Variables
```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/discux"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Vector Database (Qdrant)
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY="your-qdrant-key-here"

# AI Services
ZAI_API_KEY="your-zai-api-key-here"

# Optional: Email provider untuk registration verification
EMAIL_FROM="noreply@discux3.com"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
```

### Development Setup
1. **Install Dependencies**:
   ```bash
   npm install next-auth @auth/prisma-adapter
   ```

2. **Configure Database**:
   ```bash
   npx prisma migrate dev
   ```

3. **Setup NextAuth.js**:
   - Copy configuration template
   - Update environment variables
   - Test authentication flow

## 📱 Usage Examples

### Client-side Authentication
```typescript
// src/hooks/use-auth.ts
import { useSession } from "next-auth/react"

export function useAuth() {
  const { data: session, status } = useSession()

  return {
    user: session?.user,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading"
  }
}
```

### Server-side Protection
```typescript
// src/app/dashboard/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function Dashboard() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return <div>Welcome, {session.user?.name}!</div>
}
```

### Real-time Integration
```typescript
// src/app/api/socket/route.ts
import { getToken } from "next-auth/jwt"

io.use(async (socket, next) => {
  try {
    const token = await getToken({ req: socket.request as any })
    if (token) {
      socket.userId = token.sub
      next()
    } else {
      next(new Error("Unauthorized"))
    }
  } catch (error) {
    next(new Error("Authentication error"))
  }
})
```

## 🚀 Benefits

### Why NextAuth.js?
- **Native Next.js Integration**: Perfect untuk single Next.js application
- **Prisma Adapter**: Seamless database integration
- **Session Management**: Built-in session handling
- **Security**: Production-ready security features
- **Simplicity**: No complex setup needed

### Single App Advantages
- **Unified Codebase**: Auth and app in one repository
- **Shared Types**: TypeScript types consistent everywhere
- **Simplified Development**: No cross-repo dependencies
- **Single Deployment**: One deployment for everything

## 🔄 Migration Notes

### From Custom JWT:
1. **Database Migration**: Add NextAuth.js tables ke existing schema
2. **Password Migration**: Hash existing passwords dengan bcrypt
3. **Session Migration**: Convert existing sessions ke NextAuth.js format

### Setup Checklist:
- [ ] Install NextAuth.js dependencies
- [ ] Update Prisma schema dengan auth tables
- [ ] Configure environment variables
- [ ] Setup NextAuth.js configuration di src/lib/auth.ts
- [ ] Create API routes di src/app/api/auth/[...nextauth]/route.ts
- [ ] Update client-side auth logic
- [ ] Test authentication flow
- [ ] Update real-time connection auth
- [ ] Configure deployment settings

---

**Last Updated**: 2025-01-15
**Version**: 1.0