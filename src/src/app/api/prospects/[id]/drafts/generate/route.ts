import { NextRequest, NextResponse } from 'next/server';
import { supabase, TENANT_ID } from '@/lib/supabase';

// POST /api/prospects/[id]/drafts/generate
// Phase 3 will add Claude integration. For now, returns placeholder.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json({
    message: 'Draft generation requires Claude API (Phase 3). Run research first.',
    prospect_id: params.id,
  }, { status: 200 });
}
