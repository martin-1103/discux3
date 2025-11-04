# Discux3 - Multi-Agent Chat Platform

## 🎯 Project Overview

Multi-Agent Collaboration Hub - Platform di mana beberapa AI agents dengan persona berbeda bisa berdiskusi dengan multiple users untuk solve complex problems.

## 💡 Core Concept

User bisa create chat rooms dengan multiple users dan multiple AI agents. Setiap agent punya persona berbeda yang didefinisikan oleh user. Interaksi menggunakan natural mention system seperti Slack/Discord.

## 🛠️ Technology Stack

### Core Platform
- **Framework**: Next.js 14 (App Router) - single application dengan direct database access
- **Language**: TypeScript - end-to-end type safety
- **Package Management**: Standard npm dengan single package.json
- **Deployment**: Single deployment target (Vercel)

### Web Application
- **UI Framework**: shadcn/ui + Tailwind CSS - modern, accessible components
- **State Management**: Zustand - lightweight, perfect untuk real-time chat performance
- **Real-time Client**: Socket.io-client - WebSocket communication
- **Forms**: React Hook Form + Zod validation
- **Components**: Custom React components dengan shared UI package

### Authentication & Database
- **Authentication**: NextAuth.js dengan Prisma adapter - native Next.js integration
- **Database**: MySQL - reliable relational database untuk structured data
- **ORM**: Prisma - type-safe database access dengan migrations
- **Real-time Server**: Socket.io - WebSocket server untuk chat communication

### AI & External Services
- **Vector Database**: Qdrant - semantic search dan AI memory
- **AI Integration**: Z.ai API (GLM-4.6) - AI generation dan agent responses
- **Validation**: Zod - runtime type validation

### Architecture Benefits
- **Single Application**: Unified Next.js app dengan direct database access
- **Unified Authentication**: NextAuth.js API routes terintegrasi dalam Next.js app
- **Type Safety**: End-to-end TypeScript dari database ke UI
- **Simplified Data Flow**: Server Actions + Socket.io WebSocket untuk optimal performance
- **Database Integration**: Prisma dengan built-in NextAuth.js adapter support
- **No API Overhead**: Direct database access tanpa REST API endpoints

## 🔄 Core Logic Flow

1. **Session Initialization**
   ```
   User Start → Create Session → Select Agents → Define Topic → Begin Discussion
   ```

2. **Agent Orchestration**
   ```
   User @mentions → Moderator synthesizes context → Selected agents respond → Continue
   ```

3. **Mention System**
   - `@all` - All agents participate
   - `@agent_name` - Specific agent responds
   - AI Moderator manages conversation flow

## 📱 Core Features

### 1. Agent Creation System
- **Simple Interface**: Name + System Prompt + Style
- **Style Presets**: Professional, Direct, Friendly, Creative, Analytical
- **Custom Prompts**: Full flexibility untuk persona definition
- **Agent Testing**: Quick preview sebelum save

### 2. Chat Engine
- **Real-time Messaging**: WebSocket untuk instant responses
- **Multi-user Support**: Multiple humans dalam satu room
- **Agent Color Coding**: Visual distinction per agent
- **Context Management**: AI Moderator synthesizes percakapan

### 3. Room Management
- **Multiple Sessions**: Bisa run beberapa diskusi paralel
- **Agent Selection**: Pilih agents yang participate per room
- **Room Persistence**: Save & resume conversations
- **Simple Invitation System**: Generate shareable invitation links for easy room access

### 4. Agent Management
- **CRUD Operations**: Create, Edit, Delete Agents
- **Agent Library**: Personal collection user-created agents
- **Quick Testing**: Test agent behavior sebelum digunakan

## 🚀 Development Roadmap

### Phase 1 - MVP (4-6 weeks)
- ✅ Agent creation (name + prompt + style)
- ✅ Agent list management
- ✅ Room creation dengan agent selection
- ✅ Basic chat dengan @mention system
- ✅ AI Moderator untuk context synthesis
- ✅ Agent testing feature
- 🔄 Simple link-based invitation system

### Phase 2 - Enhancement (4-6 weeks)
- 🔄 Enhanced multi-user room features
- 🔄 Conversation history & search
- 🔄 Agent sharing via links
- 🔄 Improved AI Moderator intelligence
- 🔄 Mobile responsiveness

### Phase 3 - Platform (6-8 weeks)
- 🔄 Agent marketplace/gallery
- 🔄 Advanced room features (permissions, roles)
- 🔄 Integration dengan external tools
- 🔄 Analytics & insights
- 🔄 Voice/audio support

## 💰 Business Model

### Monetization Strategy
1. **Freemium Model**
   - Free: 3 agents, 1 active room
   - Pro: Unlimited agents, unlimited rooms ($15/month)
   - Team: Multi-user collaboration ($50/month/team)

2. **Usage-based**
   - Additional AI calls beyond threshold
   - Premium AI model access (GLM-4.6 unlimited)

3. **Future Opportunities**
   - Custom agent development services
   - Enterprise integrations
   - White-label solutions

## 🎯 Success Metrics

### User Engagement
- Daily active users
- Average session duration
- Messages per room
- Agent creation rate

### Product Quality
- Agent response relevance scores
- Conversation success rates
- User retention (7-day, 30-day)
- Feature adoption rates

### Business Growth
- Free-to-paid conversion rate
- Monthly recurring revenue growth
- Customer acquisition cost
- Lifetime value

## 🔥 Unique Value Proposition

**Differentiation dari ChatGPT/Single AI:**
- **Diverse Perspectives**: Multiple agents dengan berbagai expertise
- **Natural Team Dynamics**: Human + AI collaboration dalam satu interface
- **Customizable Intelligence**: User bisa create agents sesuai kebutuhan
- **Structured Collaboration**: Framework untuk productive multi-stakeholder discussions

**Why this matters:**
Complex problems require diverse perspectives. Single AI provides one viewpoint, while teams need multiple expertise areas (technical, business, creative, analytical) working together.

## 📁 Project Documentation

### 🗂️ Project Structure
- **[Directory Structure](./directory-structure.md)** - Repository organization and file structure for single Next.js application

### 🏗️ Architecture
- **[Overview](./architecture/overview.md)** - System architecture and component relationships
- **[Database Schema](./architecture/database-schema.md)** - MySQL database design and interfaces
- **[API Design](./architecture/api-design.md)** - REST and WebSocket API specifications
- **[Invitation System](./architecture/invitation-system.md)** - Simple link-based room invitation flow
- **[AI Integration](./architecture/ai-integration.md)** - AI services and agent response logic
- **[Vector Database](./architecture/vector-database.md)** - Vector storage and semantic search
- **[Performance Optimization](./architecture/performance-optimization.md)** - Performance strategies and monitoring
- **[Deployment](./architecture/deployment.md)** - Deployment architecture and environment setup

### 🎨 Design System
- **[Design System](./design/design-system.md)** - Design principles, theming, and component guidelines
- **[Chat Interface](./design/chat-interface.md)** - Chat UI components and interaction patterns
- **[Agents Interface](./design/agents-interface.md)** - Agent management UI design and components
- **[Responsive Design](./design/responsive-design.md)** - Mobile-first approach and responsive layouts

### 💻 Development
- **[Frontend Setup](./frontend/development-environment.md)** - Next.js development environment and configuration
- **[Frontend Configuration](./frontend/configuration.md)** - Next.js configuration and setup
- **[Services Integration](./frontend/services.md)** - Socket.io client setup and external API integrations

## 🏁 Project Status

**Status**: Technology Planning Complete - Ready for Implementation
**Target Launch**: Q2 2025 (MVP)
**Team Size**: 2-3 developers
**Estimated Timeline**: 10-12 weeks to MVP
**Technology Stack**: Finalized (Next.js 14, Prisma, NextAuth.js, Zustand, Single App Architecture)

---

**Last Updated**: 2025-01-15
**Version**: 1.0