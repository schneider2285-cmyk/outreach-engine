import { NextRequest, NextResponse } from 'next/server';
import { supabase, TENANT_ID } from '@/lib/supabase';

// GET /api/prospects/[id]/outcomes
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase
    .from('outcomes')
    .select('*')
    .eq('prospect_id', params.id)
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/prospects/[id]/outcomes
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const { data, error } = await supabase
    .from('outcomes')
    .insert({
      tenant_id: TENANT_ID,
      prospect_id: params.id,
      draft_id: body.draft_id || null,
      outcome_type: body.outcome_type,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update prospect status based on outcome
  const statusMap: Record<string, string> = {
    positive: 'engaged',
    neutral: 'contacted',
    objection: 'contacted',
    referral: 'engaged',
  };
  const newStatus = statusMap[body.outcome_type];
  if (newStatus) {
    await supabase
      .from('prospects')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', params.id);
  }

  return NextResponse.json(data, { status: 201 });
}
