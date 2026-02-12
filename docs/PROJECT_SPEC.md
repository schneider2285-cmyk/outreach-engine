# Outreach Engine — Project Specification

## Overview

Multi-tenant outreach intelligence platform that generates evidence-grounded cold outreach for enterprise sales. The system does research at scale that would normally be done manually for top targets, then drafts emails in the user’s voice—so every message reads like a thoughtful person who did their homework.

## Tech Stack

- **Frontend:** Next.js 14 (App Router)
- **Hosting:** Vercel
- **Database:** Supabase Postgres
- **Research:** Perplexity Search API
- **Intelligence/Drafting:** Claude API (Anthropic)

## Live Deployments & Resources

| Resource | URL/Value |
|----------|-----------|
| Outreach Engine App | https://outreach-engine-dun.vercel.app |
| GitHub Repo | schneider2285-cmyk/outreach-engine |
| Supabase Project | ifqkgenrgwyjzuybzfwo.supabase.co |
| Command Center | https://schneider2285-cmyk.github.io/schneider-cc |

## Four Phases

### Phase 1: Skeleton ✅ COMPLETE

5 screens built: Dashboard, Accounts, Account Detail, Prospects, Prospect Detail. 9 API endpoints (stubs initially, now connected to Supabase). Database schema designed with 10 tables.

**Screens:**

- **Dashboard** (`/`) — Stats overview, account/prospect tables
- **Accounts** (`/accounts`) — Target companies, create new
- **Account Detail** (`/accounts/[id]`) — Prospects for account, add prospect (manual or LinkedIn paste)
- **All Prospects** (`/prospects`) — Filterable list across all accounts
- **Prospect Detail** (`/prospects/[id]`) — Tabs: Overview, Research, Drafts, Outcomes

**API Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts` | List accounts |
| POST | `/api/accounts` | Create account |
| GET | `/api/prospects?account_id=` | List prospects |
| POST | `/api/prospects` | Create prospect |
| GET | `/api/prospects/:id` | Prospect detail + related data |
| POST | `/api/prospects/:id/research/run` | Run research (tier: quick/standard/deep) |
| POST | `/api/prospects/:id/drafts/generate` | Generate draft variants |
| POST | `/api/drafts/:id/judge` | Score a draft (open/read/reply + claims) |
| POST | `/api/prospects/:id/outcomes` | Log an outcome |

### Phase 2: Retrieval ✅ COMPLETE

Perplexity Search API integration for real web research. Three research tiers: Quick / Standard / Deep. Live Supabase database connected. Google Sheet sync capability (pulls contacts from Schneider Command Center).

**Research Sources:**

- LinkedIn (role, background, recent activity)
- Company news feeds (earnings, announcements, funding)
- Market intelligence (what’s happening in their space)
- Person-specific signals (articles they’ve engaged with, speaking gigs, published thoughts)
- Competitive context (who they compete with, what they’re winning/losing against)

### Phase 3: Intelligence + Drafting ⬜ NEXT UP

**Four Prompt System:**

1. **Intelligence Synthesis Prompt** — Takes raw research data. Outputs: "What’s actually happening at this company?" + "What does this person likely care about?"

2. **Angle Discovery Prompt** — Takes synthesized context. Generates 3-5 potential outreach angles: Market insight, Operational efficiency, Talent/retention, Strategic positioning, etc.

3. **Email Generation Prompt** — Combines: User’s writing voice + selected angle + research evidence. Writes the actual email draft.

4. **Quality Gate / Judge Prompt** — Reviews the draft. Asks: "Does this read like a thoughtful person who did their homework, or does it read like AI?" Scores: Predicted open rate, read rate, reply likelihood. Identifies claims that need evidence backing.

### Phase 4: Learning Loop ⬜ FUTURE

- Log outcomes (opened, replied, booked meeting, no response, etc.)
- Feed outcome data back into the system
- Variant stats to learn which angles/styles perform best over time
- Perplexity-powered prospect discovery — give it a company, it finds relevant contacts to target

## Database Schema

Tables (all tenant-scoped with RLS):

| Table | Purpose |
|-------|---------|
| `tenants` | Multi-tenant isolation |
| `accounts` | Target companies (e.g., Schneider Electric, FICO) |
| `prospects` | Individual contacts within accounts |
| `profile_artifacts` | LinkedIn data, role history, etc. |
| `research_runs` | Log of each research execution (tier, timestamp, status) |
| `web_evidence` | Raw evidence from Perplexity searches |
| `insights` | Synthesized intelligence from research |
| `drafts` | Generated email drafts with metadata |
| `outcomes` | Logged results (open, reply, meeting, etc.) |
| `variant_stats` | Aggregated performance data for learning loop |

## Integration with Command Center

The Outreach Engine connects to the Schneider Command Center Google Sheet:

- Sync button pulls contacts from the Command Center into Supabase
- Contacts include: Name, Title, Email, Tier (0-3), Program affiliation, Buying role
- 80+ Schneider contacts already mapped in the Command Center

## Environment Variables (Vercel)

All keys stored securely in Vercel environment variables:

- ANTHROPIC_API_KEY
- PERPLEXITY_API_KEY
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

## Current Status & Next Steps

**Status:** Phase 2 deployed and working. Database connected. Perplexity research pipeline functional.

**Immediate Next Steps:**

1. Seed Command Center contacts into Supabase (Tier 0-2 priority contacts)
2. Test research pipeline on real people (Charise Le, Gregory McManaway, Philippe Rambach, etc.)
3. Build Phase 3 — Wire up Claude API for:
   - Intelligence synthesis
   - Angle discovery
   - Draft generation
   - Judge scoring

## Key Design Principles

- **Evidence-grounded:** Every claim in an email should be backed by real research
- **Voice-preserved:** Drafts should sound like the user, not generic AI
- **Scale without sacrifice:** Do the homework at scale that would normally be done manually for top 5 targets
- **Learn over time:** Track outcomes, feed back into the system, continuously improve

## Commands for Development

```bash
# Clone
git clone https://github.com/schneider2285-cmyk/outreach-engine.git
cd outreach-engine

# Install
npm install

# Run locally
npm run dev
```

Open http://localhost:3000
