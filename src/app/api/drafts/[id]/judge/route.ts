import { NextResponse } from 'next/server';

// POST /api/drafts/:id/judge
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Phase 1 stub: return mock scores
  return NextResponse.json({
    draft_id: id,
    open_score: Math.floor(Math.random() * 30) + 50,
    read_score: Math.floor(Math.random() * 30) + 45,
    reply_score: Math.floor(Math.random() * 30) + 40,
    claims_audit: {
      passed: true,
      claims_ledger: [
        { claim: '[Stub] Example claim from draft', evidence_id: null, supported: true },
      ],
      unsupported_count: 0,
    },
    message: '[Phase 1 stub] Judge scoring will use Claude API in Phase 3.',
  });
}
