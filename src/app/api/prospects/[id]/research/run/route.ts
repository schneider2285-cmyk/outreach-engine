import { NextResponse } from 'next/server';
import { ResearchRun } from '@/types';

// POST /api/prospects/:id/research/run  body: {tier: quick|standard|deep}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const tier = body.tier || 'quick';

  // Phase 1 stub: return mock research run
  const run: ResearchRun = {
    id: crypto.randomUUID(),
    tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    prospect_id: id,
    tier,
    status: 'completed',
    search_count: tier === 'quick' ? 2 : tier === 'standard' ? 6 : 12,
    token_count: tier === 'quick' ? 800 : tier === 'standard' ? 4200 : 9500,
    cost_estimate_usd: tier === 'quick' ? 0.008 : tier === 'standard' ? 0.032 : 0.085,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  return NextResponse.json({
    research_run: run,
    message: `[Phase 1 stub] ${tier} research completed for prospect ${id}. Perplexity + Claude integration in Phase 2/3.`,
  });
}
