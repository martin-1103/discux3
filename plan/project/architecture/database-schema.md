# Database Schema Design

## 📊 MySQL Schema with NextAuth.js Integration

### NextAuth.js Required Tables
```sql
-- NextAuth.js Account table (OAuth providers)
CREATE TABLE Account (
  id VARCHAR(255) PRIMARY KEY,
  userId VARCHAR(255) NOT NULL,
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  providerAccountId VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type VARCHAR(255),
  scope VARCHAR(255),
  id_token TEXT,
  session_state VARCHAR(255),
  authorization_code TEXT,
  expires_at_ms BIGINT,
  created_at BIGINT DEFAULT 0,
  updated_at BIGINT DEFAULT 0,
  UNIQUE INDEX idx_provider_account (provider, providerAccountId),
  INDEX idx_userId (userId)
);

-- NextAuth.js Session table
CREATE TABLE Session (
  id VARCHAR(255) PRIMARY KEY,
  sessionToken VARCHAR(255) UNIQUE NOT NULL,
  userId VARCHAR(255) NOT NULL,
  expires BIGINT NOT NULL,
  created_at BIGINT DEFAULT 0,
  updated_at BIGINT DEFAULT 0,
  INDEX idx_sessionToken (sessionToken),
  INDEX idx_userId (userId)
);

-- NextAuth.js User table (extended for Discux3)
CREATE TABLE User (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  emailVerified TIMESTAMP,
  image TEXT,
  -- Discux3 specific fields
  avatar_url VARCHAR(500),
  subscription ENUM('free', 'pro', 'team') DEFAULT 'free',
  max_agents INT DEFAULT 3,
  max_rooms INT DEFAULT 1,
  max_messages_per_month INT DEFAULT 100,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at BIGINT DEFAULT 0,
  updated_at BIGINT DEFAULT 0,
  INDEX idx_email (email),
  INDEX idx_subscription (subscription)
);

-- NextAuth.js Verification token table
CREATE TABLE VerificationToken (
  identifier VARCHAR(255),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires BIGINT NOT NULL,
  created_at BIGINT DEFAULT 0,
  updated_at BIGINT DEFAULT 0,
  PRIMARY KEY (identifier, token)
);
```

### Discux3 Application Tables

### Agents Table
```sql
CREATE TABLE agents (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  prompt TEXT NOT NULL,
  emoji VARCHAR(2) NOT NULL DEFAULT '🤖',
  color VARCHAR(7) DEFAULT '#3B82F6',
  style ENUM('professional', 'direct', 'friendly', 'creative', 'analytical') DEFAULT 'professional',
  created_by VARCHAR(255) NOT NULL,  -- References NextAuth.js User table
  is_public BOOLEAN DEFAULT FALSE,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES User(id) ON DELETE CASCADE,
  INDEX idx_created_by (created_by),
  INDEX idx_style (style),
  INDEX idx_usage_count (usage_count)
);
```

### Rooms Table
```sql
CREATE TABLE rooms (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  created_by VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES User(id) ON DELETE CASCADE,
  INDEX idx_created_by (created_by),
  INDEX idx_active (is_active)
);
```

### Room Settings Table
```sql
CREATE TABLE room_settings (
  room_id VARCHAR(36) PRIMARY KEY,
  max_agents INT DEFAULT 5,
  allow_agent_creation BOOLEAN DEFAULT TRUE,
  auto_summarize BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);
```

### Room Participants (Many-to-Many)
```sql
CREATE TABLE room_participants (
  id VARCHAR(36) PRIMARY KEY,
  room_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  role ENUM('owner', 'admin', 'member') DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE,
  UNIQUE KEY unique_room_user (room_id, user_id),
  INDEX idx_room_id (room_id),
  INDEX idx_user_id (user_id)
);
```

### Room Agents (Many-to-Many)
```sql
CREATE TABLE room_agents (
  id VARCHAR(36) PRIMARY KEY,
  room_id VARCHAR(36) NOT NULL,
  agent_id VARCHAR(36) NOT NULL,
  added_by VARCHAR(255) NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (added_by) REFERENCES User(id) ON DELETE CASCADE,
  UNIQUE KEY unique_room_agent (room_id, agent_id),
  INDEX idx_room_id (room_id),
  INDEX idx_agent_id (agent_id)
);
```

### Messages Table
```sql
CREATE TABLE messages (
  id VARCHAR(36) PRIMARY KEY,
  room_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  type ENUM('user', 'agent', 'system') NOT NULL,
  sender_id VARCHAR(255) NOT NULL,
  processing_time DECIMAL(10,3),
  agent_confidence DECIMAL(3,2),
  context_length INT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  INDEX idx_room_timestamp (room_id, timestamp),
  INDEX idx_sender_id (sender_id),
  INDEX idx_type (type),
  FULLTEXT idx_content (content)
);
```

### Message Mentions (Normalized Array)
```sql
CREATE TABLE message_mentions (
  id VARCHAR(36) PRIMARY KEY,
  message_id VARCHAR(36) NOT NULL,
  mentioned_agent_id VARCHAR(36) NOT NULL,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (mentioned_agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  INDEX idx_message_id (message_id),
  INDEX idx_agent_id (mentioned_agent_id)
);
```

### Room Invitations Table
```sql
CREATE TABLE room_invitations (
  id VARCHAR(36) PRIMARY KEY,
  room_id VARCHAR(36) NOT NULL,
  invited_by VARCHAR(255) NOT NULL,
  invite_token VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  expires_at TIMESTAMP NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES User(id) ON DELETE CASCADE,
  INDEX idx_room_id (room_id),
  INDEX idx_invite_token (invite_token),
  INDEX idx_expires_at (expires_at)
);
```

## 🎯 TypeScript Interfaces

### User Interface
```typescript
interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  subscription: 'free' | 'pro' | 'team'
  max_agents: number
  max_rooms: number
  max_messages_per_month: number
  created_at: Date
  last_active: Date
}
```

### Agent Interface
```typescript
interface Agent {
  id: string
  name: string
  prompt: string
  emoji: string
  color: string
  style: 'professional' | 'direct' | 'friendly' | 'creative' | 'analytical'
  created_by: string
  is_public: boolean
  usage_count: number
  created_at: Date
  updated_at: Date
}
```

### Room Interface
```typescript
interface Room {
  id: string
  name: string
  description?: string
  created_by: string
  is_active: boolean
  created_at: Date
  updated_at: Date
  settings?: {
    max_agents: number
    allow_agent_creation: boolean
    auto_summarize: boolean
  }
  participants?: RoomParticipant[]
  agents?: RoomAgent[]
}
```

### Room Participant Junction
```typescript
interface RoomParticipant {
  id: string
  room_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: Date
}
```

### Room Agent Junction
```typescript
interface RoomAgent {
  id: string
  room_id: string
  agent_id: string
  added_by: string
  added_at: Date
}
```

### Message Interface
```typescript
interface Message {
  id: string
  room_id: string
  content: string
  type: 'user' | 'agent' | 'system'
  sender_id: string
  processing_time?: number
  agent_confidence?: number
  context_length?: number
  timestamp: Date
  mentions?: MessageMention[]
}
```

### Message Mention Junction
```typescript
interface MessageMention {
  id: string
  message_id: string
  mentioned_agent_id: string
}
```

### Room Invitation Interface
```typescript
interface RoomInvitation {
  id: string
  room_id: string
  invited_by: string
  invite_token: string
  email?: string
  expires_at?: Date
  used_at?: Date
  created_at: Date
}
```

## 🔗 Database Relationships

### Entity Relationship Summary
- **Users** can create multiple **Agents** and **Rooms**
- **Rooms** have multiple **Participants** (Users) and **Agents**
- **Messages** belong to **Rooms** and are sent by **Users** or **Agents**
- **Message Mentions** create relationships between **Messages** and **Agents**
- **Room Settings** provide configuration for each **Room**
- **Room Invitations** allow users to invite others to join rooms via shareable links

### Key Constraints
- Foreign keys ensure data integrity
- Unique constraints prevent duplicates
- Indexes optimize query performance
- Full-text indexes enable content search

### Data Normalization
- Proper normalization eliminates data redundancy
- Junction tables handle many-to-many relationships
- Flattened JSON objects improve query performance
- Timestamps track creation and modification

## 🔐 NextAuth.js Prisma Schema

### Complete Prisma Schema with NextAuth.js Integration
```prisma
// packages/database/src/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// NextAuth.js required models
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

  @@map("User")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// Discux3 models
model Agent {
  id          String          @id @default(cuid())
  name        String
  prompt      String          @db.Text
  emoji       String          @default("🤖")
  color       String          @default("#3B82F6")
  style       AgentStyle      @default(PROFESSIONAL)
  isPublic    Boolean         @default(false) @map("is_public")
  usageCount  Int             @default(0) @map("usage_count")
  createdAt   DateTime        @default(now()) @map("created_at")
  updatedAt   DateTime        @updatedAt @map("updated_at")

  createdBy   String          @map("created_by")
  creator     User            @relation(fields: [createdBy], references: [id], onDelete: Cascade)

  roomAgents  RoomAgent[]
  mentions    MessageMention[]

  @@map("agents")
}

model Room {
  id          String    @id @default(cuid())
  name        String
  description String?   @db.Text
  isActive    Boolean   @default(true) @map("is_active")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  createdBy   String    @map("created_by")
  creator     User      @relation(fields: [createdBy], references: [id], onDelete: Cascade)

  settings    RoomSettings?
  participants RoomParticipant[]
  agents      RoomAgent[]
  messages    Message[]
  invitations RoomInvitation[]

  @@map("rooms")
}

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
```

## 🔄 Migration Strategy

### From Custom Auth to NextAuth.js
1. **Backup existing data** from current users table
2. **Create new schema** with NextAuth.js tables
3. **Migrate user data** to new User table structure
4. **Update foreign keys** in application tables
5. **Test authentication flow** with migrated data

### Migration Commands
```bash
# Create migration for NextAuth.js tables
npx prisma migrate dev --name add-nextauth-tables

# Deploy to production
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

---

**Related Files:**
- [Authentication Overview](../auth/overview.md) - NextAuth.js configuration and setup
- [Architecture Overview](./overview.md) - System architecture and component relationships
- [API Design](./api-design.md) - REST and WebSocket API specifications
- [Performance Optimization](./performance-optimization.md) - Database optimization strategies