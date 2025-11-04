# Local Development Setup

## 🚀 Development Environment

### Stack Configuration
```
Local Development:
├── Discux3 App (localhost:3000) - Single Next.js application
│   ├── React components + Server Actions
│   ├── API Routes (Next.js)
│   └── Socket.io WebSocket
├── MySQL (localhost:3306) - XAMPP
│   └── Database: discux
│   └── User: root
│   └── Password: (empty)
├── Qdrant (localhost:6333) - Docker
└── AI Services: Z.ai API
```

### Local Services Setup
- **MySQL**: XAMPP with database `discux`
- **Qdrant**: Docker container running on port 6333
- **Prisma**: ORM for database operations

## ⚙️ Environment Configuration

### Environment Variables (.env.local)
```bash
# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database Configuration (XAMPP)
DATABASE_URL="mysql://root:@localhost:3306/discux"

# NextAuth.js Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Qdrant Configuration (Docker)
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY=development_key

# AI Services
ZAI_API_KEY=your_zai_api_key
```

## 🚀 Quick Start

### Prerequisites
1. **XAMPP** - MySQL server running on port 3306
2. **Docker** - For Qdrant vector database
3. **Node.js 18+** - For Next.js development

### Setup Commands
```bash
# 1. Start Qdrant Docker container
docker run -d --name qdrant \
  -p 6333:6333 \
  qdrant/qdrant

# 2. Clone and setup project
git clone <repository-url>
cd discux3

# 3. Install dependencies
npm install

# 4. Setup environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# 5. Setup database
npx prisma migrate dev
npx prisma generate

# 6. Start development server
npm run dev
```

### Database Setup
```bash
# Create MySQL database (via XAMPP/phpMyAdmin)
CREATE DATABASE discux;

# The schema will be created automatically by Prisma migrations
```

### Verify Setup
- **Next.js App**: http://localhost:3000
- **MySQL**: phpMyAdmin at http://localhost/phpmyadmin
- **Qdrant**: http://localhost:6333/dashboard


---

**Related Files:**
- [Architecture Overview](./overview.md) - System architecture and component relationships
- [Database Schema](./database-schema.md) - MySQL database design and interfaces