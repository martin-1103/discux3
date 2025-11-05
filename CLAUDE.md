WHEN RUNNING NPM RUN DEV ALWAYS KILL EXISTING NODE PROCESSES. always use PORT 3000
WHEN RUNNING NPM RUN DEV ALWAYS KILL EXISTING NODE PROCESSES. always use PORT 3000
WHEN RUNNING NPM RUN DEV ALWAYS KILL EXISTING NODE PROCESSES. always use PORT 3000
WHEN RUNNING NPM RUN DEV ALWAYS KILL EXISTING NODE PROCESSES. always use PORT 3000

# Discux3 Development Project

This project uses Navigator v3.1.0 for development workflow management and documentation.

## Navigator Workflow

### Session Management
1. **Start Session**: `Start my Navigator session`
2. **Work on Features**: Use `Create task for [feature]`
3. **Save Progress**: `Save my Navigator session`

### Key Commands
- `Start my Navigator session` - Load project context
- `Create task for [feature]` - Plan implementation
- `Document this solution` - Create SOP from recent work
- `Save my Navigator session` - Persist session memory
- `Show project status` - View current context

## Project Structure

```
src/
├── app/              # Next.js App Router
├── components/       # React components
├── lib/             # Utilities and actions
│   ├── actions/     # Server actions
│   └── embeddings.ts
└── prisma/          # Database schema

.agent/              # Navigator documentation
├── tasks/           # Implementation plans
├── system/          # Architecture docs
├── sops/           # Standard procedures
└── grafana/        # Metrics dashboard
```

## Development Standards

- Follow Next.js App Router conventions
- Use TypeScript strict mode
- Test with Jest and React Testing Library
- Use feature branches for development
- Optimize for performance and accessibility

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Database**: Prisma ORM
- **Auth**: NextAuth 5.0.0-beta
- **UI**: Radix UI + Tailwind CSS
- **State**: Zustand
- **Vector DB**: Qdrant
- **Real-time**: Socket.io
- **Testing**: Jest + React Testing Library

For full documentation, see `.agent/DEVELOPMENT-README.md`