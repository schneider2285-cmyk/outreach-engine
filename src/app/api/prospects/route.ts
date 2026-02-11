import { NextRequest, NextResponse } from 'next/server';
import { supabase, TENANT_ID } from '@/lib/supabase';

// GET /api/prospects?account_id=xxx
export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('account_id');

  let query = supabase
    .from('prospects')
    .select('*, accounts!inner(name)')
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false });

  if (accountId) {
    query = query.eq('account_id', accountId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = data?.map(p => ({
    ...p,
    account_name: (p.accounts as any)?.name || '',
    accounts: undefined,
  }));

  return NextResponse.json(enriched);
}

// POST /api/prospects
export async function POST(request: Request) {
  const body = await request.json();
  const { data, error } = await supabase
    .from('prospects')
    .insert({
      tenant_id: TENANT_ID,
      account_id: body.account_id,
      full_name: body.full_name,
      title: body.title || null,
      linkedin_url: body.linkedin_url || null,
      email: body.email || null,
      phone: body.phone || null,
      location: body.location || null,
      seniority: body.seniority || null,
      department: body.department || null,
      bu_hypothesis: body.bu_hypothesis || null,
      status: 'new',
      persona_segment: body.persona_segment || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
