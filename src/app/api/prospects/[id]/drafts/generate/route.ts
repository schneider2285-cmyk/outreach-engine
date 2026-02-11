import { NextResponse } from 'next/server';

// POST /api/prospects/:id/drafts/generate
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Phase 1 stub: return placeholder drafts
  const stubDrafts = [
    { id: crypto.randomUUID(), channel: 'email', variant_number: 1, subject: '[Stub] Email V1', body: 'Phase 1 stub — Claude draft generation in Phase 3.', status: 'draft' },
    { id: crypto.randomUUID(), channel: 'email', variant_number: 2, subject: '[Stub] Email V2', body: 'Phase 1 stub — Claude draft generation in Phase 3.', status: 'draft' },
    { id: crypto.randomUUID(), channel: 'email', variant_number: 3, subject: '[Stub] Email V3', body: 'Phase 1 stub — Claude draft generation in Phase 3.', status: 'draft' },
    { id: crypto.randomUUID(), channel: 'linkedin', variant_number: 1, body: 'Phase 1 stub — Claude draft generation in Phase 3.', status: 'draft' },
    { id: crypto.randomUUID(), channel: 'linkedin', variant_number: 2, body: 'Phase 1 stub — Claude draft generation in Phase 3.', status: 'draft' },
  ];

  return NextResponse.json({
    prospect_id: id,
    drafts: stubDrafts,
    message: '[Phase 1 stub] Draft generation will use Claude API in Phase 3.',
  });
}
