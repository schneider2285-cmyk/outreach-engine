import { NextRequest, NextResponse } from 'next/server';
import { supabase, TENANT_ID } from '@/lib/supabase';

// GET /api/drafts/[id]
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase
    .from('drafts')
    .select('*')
    .eq('id', params.id)
    .eq('tenant_id', TENANT_ID)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

// PATCH /api/drafts/[id]
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const { data, error } = await supabase
    .from('drafts')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('tenant_id', TENANT_ID)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
