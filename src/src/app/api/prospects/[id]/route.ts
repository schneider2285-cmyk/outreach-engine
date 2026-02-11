import { NextRequest, NextResponse } from 'next/server';
import { supabase, TENANT_ID } from '@/lib/supabase';

// GET /api/prospects/[id]
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase
    .from('prospects')
    .select('*, accounts!inner(name)')
    .eq('id', params.id)
    .eq('tenant_id', TENANT_ID)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  // Get research runs
  const { data: runs } = await supabase
    .from('research_runs')
    .select('*')
    .eq('prospect_id', params.id)
    .order('created_at', { ascending: false });

  // Get drafts
  const { data: drafts } = await supabase
    .from('drafts')
    .select('*')
    .eq('prospect_id', params.id)
    .order('created_at', { ascending: false });

  // Get outcomes
  const { data: outcomes } = await supabase
    .from('outcomes')
    .select('*')
    .eq('prospect_id', params.id)
    .order('created_at', { ascending: false });

  // Get web evidence
  const { data: evidence } = await supabase
    .from('web_evidence')
    .select('*')
    .eq('prospect_id', params.id)
    .order('created_at', { ascending: false });

  // Get insights
  const { data: insights } = await supabase
    .from('insights')
    .select('*')
    .eq('prospect_id', params.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({
    ...data,
    account_name: (data.accounts as any)?.name || '',
    accounts: undefined,
    research_runs: runs || [],
    drafts: drafts || [],
    outcomes: outcomes || [],
    evidence: evidence || [],
    insights: insights || [],
  });
}

// PATCH /api/prospects/[id]
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const { data, error } = await supabase
    .from('prospects')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('tenant_id', TENANT_ID)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
