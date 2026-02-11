-- Outreach Engine Schema
-- All tables are tenant-scoped via tenant_id

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TENANTS
-- ============================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ACCOUNTS (target companies)
-- ============================================
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  hq_location TEXT,
  employee_count TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_accounts_tenant ON accounts(tenant_id);

-- ============================================
-- PROSPECTS
-- ============================================
CREATE TABLE prospects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  title TEXT,
  linkedin_url TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  seniority TEXT, -- C-Suite, VP, Director, Manager, IC
  department TEXT,
  bu_hypothesis TEXT,
  status TEXT DEFAULT 'new', -- new, researched, drafted, contacted, engaged
  persona_segment TEXT, -- tech_leader, procurement, transformation, ops
  raw_linkedin_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_prospects_tenant ON prospects(tenant_id);
CREATE INDEX idx_prospects_account ON prospects(account_id);

-- ============================================
-- PROFILE ARTIFACTS (parsed from LinkedIn paste)
-- ============================================
CREATE TABLE profile_artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL, -- experience, education, skill, certification, summary
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_profile_artifacts_prospect ON profile_artifacts(prospect_id);

-- ============================================
-- RESEARCH RUNS
-- ============================================
CREATE TABLE research_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('quick', 'standard', 'deep')),
  status TEXT DEFAULT 'pending', -- pending, running, completed, failed
  search_count INTEGER DEFAULT 0,
  token_count INTEGER DEFAULT 0,
  cost_estimate_usd NUMERIC(10,4) DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_research_runs_prospect ON research_runs(prospect_id);

-- ============================================
-- WEB EVIDENCE (from Perplexity searches)
-- ============================================
CREATE TABLE web_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  research_run_id UUID NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  source_title TEXT,
  snippet TEXT NOT NULL,
  extracted_facts JSONB, -- array of fact strings
  search_query TEXT,
  relevance_score NUMERIC(5,2),
  fetched_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_web_evidence_prospect ON web_evidence(prospect_id);
CREATE INDEX idx_web_evidence_run ON web_evidence(research_run_id);

-- ============================================
-- INSIGHTS (synthesized from evidence)
-- ============================================
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  research_run_id UUID NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL, -- role_summary, bu_mapping, initiative_hypothesis, messaging_strategy
  content JSONB NOT NULL,
  confidence TEXT DEFAULT 'medium', -- low, medium, high
  supporting_evidence_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_insights_prospect ON insights(prospect_id);

-- ============================================
-- DRAFTS
-- ============================================
CREATE TABLE drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'linkedin')),
  variant_number INTEGER NOT NULL,
  subject TEXT, -- email only
  body TEXT NOT NULL,
  hook_type TEXT, -- question, stat, mutual_connection, insight, challenge
  angle TEXT, -- transformation, cost_savings, talent, innovation, risk
  cta_type TEXT, -- meeting, intro, resource, question
  length_bucket TEXT, -- short, medium, long
  persona_segment TEXT,
  open_score INTEGER,
  read_score INTEGER,
  reply_score INTEGER,
  claims_audit_passed BOOLEAN,
  claims_ledger JSONB, -- array of {claim, evidence_id, supported}
  status TEXT DEFAULT 'draft', -- draft, approved, sent, rejected
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_drafts_prospect ON drafts(prospect_id);

-- ============================================
-- OUTCOMES (manual logging)
-- ============================================
CREATE TABLE outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  draft_id UUID REFERENCES drafts(id) ON DELETE SET NULL,
  outcome_type TEXT NOT NULL CHECK (outcome_type IN (
    'no_reply', 'positive', 'neutral', 'objection',
    'not_relevant', 'referral', 'unsubscribe'
  )),
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_outcomes_prospect ON outcomes(prospect_id);
CREATE INDEX idx_outcomes_draft ON outcomes(draft_id);

-- ============================================
-- VARIANT STATS (learning loop)
-- ============================================
CREATE TABLE variant_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  hook_type TEXT NOT NULL,
  angle TEXT NOT NULL,
  cta_type TEXT NOT NULL,
  length_bucket TEXT NOT NULL,
  persona_segment TEXT NOT NULL,
  total_sent INTEGER DEFAULT 0,
  positive_count INTEGER DEFAULT 0,
  neutral_count INTEGER DEFAULT 0,
  negative_count INTEGER DEFAULT 0,
  reply_rate NUMERIC(5,4) DEFAULT 0,
  positive_rate NUMERIC(5,4) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_variant_stats_tenant ON variant_stats(tenant_id);
CREATE INDEX idx_variant_stats_lookup ON variant_stats(tenant_id, persona_segment, hook_type, angle);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_stats ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, so API routes using service role key will work.
-- For future Supabase Auth integration, add policies here.
