import { NextResponse } from 'next/server';
import { mockProspects, mockDrafts, mockOutcomes, mockResearchRuns, mockEvidence, mockInsights } from '@/lib/mock-data';

// GET /api/prospects/:id
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const prospect = mockProspects.find(p => p.id === id);
  if (!prospect) {
    return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  }

  const drafts = mockDrafts.filter(d => d.prospect_id === id);
  const outcomes = mockOutcomes.filter(o => o.prospect_id === id);
  const researchRuns = mockResearchRuns.filter(r => r.prospect_id === id);
  const evidence = mockEvidence.filter(e => e.prospect_id === id);
  const insights = mockInsights.filter(i => i.prospect_id === id);

  return NextResponse.json({
    prospect,
    drafts,
    outcomes,
    research_runs: researchRuns,
    evidence,
    insights,
  });
}
