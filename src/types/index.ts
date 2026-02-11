// ============================================
// Core Types for Outreach Engine
// ============================================

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Account {
  id: string;
  tenant_id: string;
  name: string;
  domain?: string;
  industry?: string;
  hq_location?: string;
  employee_count?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  prospect_count?: number;
}

export interface Prospect {
  id: string;
  tenant_id: string;
  account_id: string;
  full_name: string;
  title?: string;
  linkedin_url?: string;
  email?: string;
  phone?: string;
  location?: string;
  seniority?: string;
  department?: string;
  bu_hypothesis?: string;
  status: 'new' | 'researched' | 'drafted' | 'contacted' | 'engaged';
  persona_segment?: string;
  raw_linkedin_text?: string;
  created_at: string;
  updated_at: string;
  account_name?: string;
}

export interface ProfileArtifact {
  id: string;
  tenant_id: string;
  prospect_id: string;
  artifact_type: 'experience' | 'education' | 'skill' | 'certification' | 'summary';
  content: Record<string, unknown>;
  created_at: string;
}

export interface ResearchRun {
  id: string;
  tenant_id: string;
  prospect_id: string;
  tier: 'quick' | 'standard' | 'deep';
  status: 'pending' | 'running' | 'completed' | 'failed';
  search_count: number;
  token_count: number;
  cost_estimate_usd: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
}

export interface WebEvidence {
  id: string;
  tenant_id: string;
  research_run_id: string;
  prospect_id: string;
  source_url: string;
  source_title?: string;
  snippet: string;
  extracted_facts?: string[];
  search_query?: string;
  relevance_score?: number;
  fetched_at: string;
}

export interface Insight {
  id: string;
  tenant_id: string;
  prospect_id: string;
  research_run_id: string;
  insight_type: 'role_summary' | 'bu_mapping' | 'initiative_hypothesis' | 'messaging_strategy';
  content: Record<string, unknown>;
  confidence: 'low' | 'medium' | 'high';
  supporting_evidence_ids: string[];
  created_at: string;
}

export interface Draft {
  id: string;
  tenant_id: string;
  prospect_id: string;
  channel: 'email' | 'linkedin';
  variant_number: number;
  subject?: string;
  body: string;
  hook_type?: string;
  angle?: string;
  cta_type?: string;
  length_bucket?: string;
  persona_segment?: string;
  open_score?: number;
  read_score?: number;
  reply_score?: number;
  claims_audit_passed?: boolean;
  claims_ledger?: ClaimEntry[];
  status: 'draft' | 'approved' | 'sent' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface ClaimEntry {
  claim: string;
  evidence_id?: string;
  supported: boolean;
}

export type OutcomeType = 'no_reply' | 'positive' | 'neutral' | 'objection' | 'not_relevant' | 'referral' | 'unsubscribe';

export interface Outcome {
  id: string;
  tenant_id: string;
  prospect_id: string;
  draft_id?: string;
  outcome_type: OutcomeType;
  notes?: string;
  logged_at: string;
  created_at: string;
}

export interface VariantStats {
  id: string;
  tenant_id: string;
  hook_type: string;
  angle: string;
  cta_type: string;
  length_bucket: string;
  persona_segment: string;
  total_sent: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  reply_rate: number;
  positive_rate: number;
}
