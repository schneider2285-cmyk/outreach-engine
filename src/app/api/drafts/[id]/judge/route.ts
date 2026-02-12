import { NextRequest, NextResponse } from 'next/server';
import { supabase, TENANT_ID } from '@/lib/supabase';
import { judgeDrafts, DraftOutput } from '@/lib/claude';

// POST /api/drafts/[id]/judge
// Phase 3: Re-judge an existing draft using Claude
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  // 1. Get the draft
  const { data: draft, error: dErr } = await supabase
    .from('drafts')
    .select('*')
    .eq('id', params.id)
    .eq('tenant_id', TENANT_ID)
    .single();

  if (dErr || !draft) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }

  // 2. Get prospect info
  const { data: prospect } = await supabase
    .from('prospects')
    .select('full_name, title, accounts!inner(name)')
    .eq('id', draft.prospect_id)
    .eq('tenant_id', TENANT_ID)
    .single();

  if (!prospect) {
    return NextResponse.json({ error: 'Prospect not found for this draft' }, { status: 404 });
  }

  const accountName = (prospect.accounts as any)?.name || '';

  // 3. Get evidence for claims verification
  const { data: evidence } = await supabase
    .from('web_evidence')
    .select('snippet')
    .eq('prospect_id', draft.prospect_id)
    .eq('tenant_id', TENANT_ID)
    .order('relevance_score', { ascending: false })
    .limit(10);

  const evidenceSnippets = (evidence || []).map(e => e.snippet).filter(Boolean) as string[];

  try {
    // 4. Build draft object for the judge
    const draftInput: DraftOutput = {
      channel: draft.channel || 'email',
      variant_number: draft.variant_number || 1,
      subject: draft.subject,
      body: draft.body,
      hook_type: draft.hook_type || 'insight',
      angle: draft.angle || '',
      cta_type: draft.cta_type || 'meeting',
      length_bucket: draft.length_bucket || 'medium',
    };

    // 5. Run judge scoring
    const { scores, usage } = await judgeDrafts(
      [draftInput],
      prospect.full_name,
      accountName,
      evidenceSnippets
    );

    const score = scores[0];

    if (!score) {
      return NextResponse.json({ error: 'Judge returned no scores' }, { status: 500 });
    }

    // 6. Update draft with new scores
    const { data: updatedDraft, error: updateErr } = await supabase
      .from('drafts')
      .update({
        open_score: score.open_score,
        read_score: score.read_score,
        reply_score: score.reply_score,
        claims_audit_passed: score.claims_audit_passed,
        claims_ledger: score.claims_ledger,
        judge_feedback: score.feedback,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      draft_id: params.id,
      open_score: score.open_score,
      read_score: score.read_score,
      reply_score: score.reply_score,
      claims_audit_passed: score.claims_audit_passed,
      claims_ledger: score.claims_ledger,
      feedback: score.feedback,
      usage,
      draft: updatedDraft,
    });

  } catch (err: any) {
    console.error('Judge scoring error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
