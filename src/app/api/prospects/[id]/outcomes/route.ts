import { NextResponse } from 'next/server';
import { Outcome } from '@/types';

// POST /api/prospects/:id/outcomes
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const outcome: Outcome = {
    id: crypto.randomUUID(),
    tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    prospect_id: id,
    draft_id: body.draft_id || null,
    outcome_type: body.outcome_type,
    notes: body.notes || null,
    logged_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  return NextResponse.json(outcome, { status: 201 });
}
