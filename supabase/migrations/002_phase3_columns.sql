-- Phase 3: Add columns needed for Claude-powered draft generation and judge scoring

-- Add judge_feedback and generation_model to drafts table
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS judge_feedback TEXT;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS generation_model TEXT;

-- Add source column to profile_artifacts
ALTER TABLE profile_artifacts ADD COLUMN IF NOT EXISTS source TEXT;

-- Make research_run_id nullable on insights (Phase 3 creates insights without a research run)
ALTER TABLE insights ALTER COLUMN research_run_id DROP NOT NULL;
