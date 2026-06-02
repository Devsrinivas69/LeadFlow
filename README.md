# LeadFlow

**Internal tool for sales ops teams** — Upload CSV lead lists, automatically distribute them across sales agents via round-robin, and track assignments.

## Prerequisites

- **Node.js** 18+ (recommended: 20+)
- **MongoDB Atlas** account ([signup](https://www.mongodb.com/cloud/atlas/register))
- **npm** (comes with Node.js)

## Quick Start

```bash
# 1. Clone and install
git clone <your-repo-url> && cd leadflow
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your MongoDB URI and a JWT secret

# 3. Seed database
npx tsx scripts/seed.ts

# 4. Start dev server
npm run dev

# 5. Open http://localhost:3000
#    Login: admin@leadflow.com / Admin@123
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.xxx.mongodb.net/leadflow` |
| `JWT_SECRET` | Secret key for JWT signing (min 256 bits) | Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/auth/login` | Login with email/password | Public |
| `POST` | `/api/auth/logout` | Clear auth cookie | Public |
| `GET` | `/api/auth/me` | Get current user | Required |
| `GET` | `/api/agents` | List agents | Admin |
| `POST` | `/api/agents` | Create agent | Admin |
| `GET` | `/api/agents/check-email?email=` | Check email availability | Admin |
| `GET` | `/api/agents/[id]` | Get agent details | Admin |
| `PATCH` | `/api/agents/[id]` | Update/deactivate agent | Admin |
| `POST` | `/api/upload` | Distribute leads | Admin |
| `GET` | `/api/lists` | List batch history | Required |
| `GET` | `/api/lists?batchId=` | Get batch details | Required |
| `GET` | `/api/dashboard/stats` | Dashboard statistics | Required |

## Architecture

```
Browser (CSV/Excel parsing) → JSON payload → Next.js API Routes → MongoDB Atlas
                                                  ↑
                                          Edge Middleware (JWT)
```

- **Frontend**: Next.js App Router, React Server Components, Tailwind CSS, shadcn/ui
- **Auth**: JWT in httpOnly Secure SameSite=Strict cookies (via `jose` library for Edge)
- **DB**: MongoDB Atlas with Mongoose ODM
- **File Processing**: Client-side with PapaParse (CSV) and SheetJS (Excel)

## Default Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@leadflow.com` | `Admin@123` |
| Agent | `aarav.sharma@leadflow.com` | `Agent@123` |

## Vercel Deployment

1. Push to GitHub
2. Import in [Vercel](https://vercel.com/import)
3. Set environment variables (`MONGODB_URI`, `JWT_SECRET`)
4. Deploy

## Known Limitations

- **Rate limiting** uses in-memory store (resets on cold starts). For production, upgrade to `@upstash/ratelimit` with Redis.
- **Password reset** flow is not implemented (noted in UI as "coming soon").
- **File size** limit is 10MB client-side; very large datasets should be paginated.
- **No real-time updates** — agents must refresh to see newly assigned leads.

## Future Improvements

- WebSocket/SSE for real-time lead notifications
- Upstash Redis rate limiting
- Password reset via email
- Lead status tracking (contacted, converted, etc.)
- Advanced distribution strategies (weighted, territory-based)
- Audit log for admin actions
- CSV template download
