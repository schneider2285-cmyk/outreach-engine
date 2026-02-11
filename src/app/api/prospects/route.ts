import { NextRequest, NextResponse } from 'next/server';
import { mockProspects } from '@/lib/mock-data';
import { Prospect } from '@/types';

// GET /api/prospects?account_id=xxx
export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('account_id');
  let results = mockProspects;
  if (accountId) {
    results = results.filter(p => p.account_id === accountId);
  }
  return NextResponse.json(results);
}

// POST /api/prospects
export async function POST(request: Request) {
  const body = await request.json();
  const newProspect: Prospect = {
    id: crypto.randomUUID(),
    tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
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
    raw_linkedin_text: body.raw_linkedin_text || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  return NextResponse.json(newProspect, { status: 201 });
}
