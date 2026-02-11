# Outreach Engine

Multi-tenant outreach intelligence platform. Generates evidence-grounded cold outreach for enterprise sales.

## Stack
- **Frontend**: Next.js 14 (App Router)
- **Hosting**: Vercel
- **Database**: Supabase Postgres
- **Retrieval**: Perplexity Search API
- **LLM**: Claude API (Anthropic)

## Phase Status
- [x] Phase 1: Skeleton (mock data, UI screens, stub endpoints)
- [ ] Phase 2: Retrieval (Perplexity integration)
- [ ] Phase 3: Intelligence + Drafting (Claude integration)
- [ ] Phase 4: Learning loop

## Quick Start

```bash
git clone https://github.com/YOUR_USER/outreach-engine.git
cd outreach-engine
npm install
npm run dev
```

Open http://localhost:3000

## Screens
- **Dashboard** (`/`) — Stats overview, account/prospect tables
- **Accounts** (`/accounts`) — Target companies, create new
- **Account Detail** (`/accounts/[id]`) — Prospects for account, add prospect (manual or LinkedIn paste)
- **All Prospects** (`/prospects`) — Filterable list across all accounts
- **Prospect Detail** (`/prospects/[id]`) — Tabs: Overview, Research, Drafts, Outcomes

## API Endpoints (Phase 1 stubs)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts` | List accounts |
| POST | `/api/accounts` | Create account |
| GET | `/api/prospects?account_id=` | List prospects |
| POST | `/api/prospects` | Create prospect |
| GET | `/api/prospects/:id` | Prospect detail + related data |
| POST | `/api/prospects/:id/research/run` | Run research |
| POST | `/api/prospects/:id/drafts/generate` | Generate drafts |
| POST | `/api/drafts/:id/judge` | Score a draft |
| POST | `/api/prospects/:id/outcomes` | Log an outcome |

## Environment Variables (Phase 2+)
```
ANTHROPIC_API_KEY=
PERPLEXITY_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Deploy to Vercel
1. Push to GitHub
2. Import in Vercel
3. Add env vars
4. Deploy

## Database
Schema in `supabase/migrations/`. All tables tenant-scoped with RLS.
