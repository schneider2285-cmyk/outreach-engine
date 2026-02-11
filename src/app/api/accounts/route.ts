import { NextResponse } from 'next/server';
import { mockAccounts } from '@/lib/mock-data';
import { Account } from '@/types';

// GET /api/accounts
export async function GET() {
  return NextResponse.json(mockAccounts);
}

// POST /api/accounts
export async function POST(request: Request) {
  const body = await request.json();
  const newAccount: Account = {
    id: crypto.randomUUID(),
    tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    name: body.name,
    domain: body.domain || null,
    industry: body.industry || null,
    hq_location: body.hq_location || null,
    employee_count: body.employee_count || null,
    notes: body.notes || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    prospect_count: 0,
  };
  // Phase 1: return mock. Phase 2+: insert into Supabase.
  return NextResponse.json(newAccount, { status: 201 });
}
