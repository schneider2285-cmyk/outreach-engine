import { NextResponse } from 'next/server';
import { supabase, TENANT_ID } from '@/lib/supabase';

// GET /api/accounts
export async function GET() {
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get prospect counts per account
  const { data: counts } = await supabase
    .from('prospects')
    .select('account_id')
    .eq('tenant_id', TENANT_ID);

  const countMap: Record<string, number> = {};
  counts?.forEach(p => {
    countMap[p.account_id] = (countMap[p.account_id] || 0) + 1;
  });

  const enriched = accounts?.map(a => ({
    ...a,
    prospect_count: countMap[a.id] || 0,
  }));

  return NextResponse.json(enriched);
}

// POST /api/accounts
export async function POST(request: Request) {
  const body = await request.json();
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      tenant_id: TENANT_ID,
      name: body.name,
      domain: body.domain || null,
      industry: body.industry || null,
      hq_location: body.hq_location || null,
      employee_count: body.employee_count || null,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
