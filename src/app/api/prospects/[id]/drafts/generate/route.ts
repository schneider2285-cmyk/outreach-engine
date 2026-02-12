import { NextRequest, NextResponse } from 'next/server';
import { supabase, TENANT_ID } from '@/lib/supabase';
import { extractProfile, generateDrafts, judgeDrafts } from '@/lib/claude';

// POST /api/prospects/[id]/drafts/generate
// Phase 3: Full Claude-powered draft generation pipeline
// Flow: Fetch prospect + evidence -> Extract profile -> Generate drafts -> Judge -> Save to DB
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const channel = body.channel || 'email';
  const numVariants = body.variants || 3;

  // 1. Get prospect + account info
  const { data: prospect, error: pErr } = await supabase
    .from('prospects')
    .select('*, accounts!inner(name)')
    .eq('id', params.id)
    .eq('tenant_id', TENANT_ID)
    .single();

  if (pErr || !prospect) {
    return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  }

  const accountName = (prospect.accounts as any)?.name || '';

  // 2. Check if research has been done
  const { data: evidence } = await supabase
    .from('web_evidence')
    .select('snippet, source_url, source_title')
    .eq('prospect_id', params.id)
    .eq('tenant_id', TENANT_ID)
    .order('relevance_score', { ascending: false })
    .limit(20);

  if (!evidence || evidence.length === 0) {
    return NextResponse.json({
      error: 'No research found. Run research first before generating drafts.',
      prospect_id: params.id,
    }, { status: 400 });
  }

  const evidenceSnippets = evidence.map(e => e.snippet).filter(Boolean) as string[];

  try {
    // 3. Extract profile artifacts using Claude
    const { artifacts, usage: extractUsage } = await extractProfile(
      prospect.full_name,
      prospect.title,
      accountName,
      evidenceSnippets
    );

    // Save profile artifacts to DB
    for (const artifact of artifacts) {
      await supabase.from('profile_artifacts').insert({
        tenant_id: TENANT_ID,
        prospect_id: params.id,
        artifact_type: artifact.artifact_type,
        content: artifact.content,
        source: 'claude_extraction',
      });
    }

    // Also save as insights
    for (const artifact of artifacts) {
      await supabase.from('insights').insert({
        tenant_id: TENANT_ID,
        prospect_id: params.id,
        insight_type: artifact.artifact_type,
        content: artifact.content,
        confidence: 'high',
      });
    }

    // 4. Generate draft variants using Claude
    const { drafts: draftOutputs, usage: draftUsage } = await generateDrafts(
      prospect.full_name,
      prospect.title,
      accountName,
      prospect.persona_segment,
      artifacts,
      channel,
      numVariants
    );

    // 5. Judge/score the drafts using Claude
    const { scores, usage: judgeUsage } = await judgeDrafts(
      draftOutputs,
      prospect.full_name,
      accountName,
      evidenceSnippets
    );

    // 6. Save drafts to DB with judge scores
    const savedDrafts = [];
    for (const draft of draftOutputs) {
      const score = scores.find(s => s.variant_number === draft.variant_number);

      const { data: savedDraft, error: draftErr } = await supabase
        .from('drafts')
        .insert({
          tenant_id: TENANT_ID,
          prospect_id: params.id,
          channel: draft.channel,
          variant_number: draft.variant_number,
          subject: draft.subject || null,
          body: draft.body,
          hook_type: draft.hook_type,
          angle: draft.angle,
          cta_type: draft.cta_type,
          length_bucket: draft.length_bucket,
          open_score: score?.open_score || null,
          read_score: score?.read_score || null,
          reply_score: score?.reply_score || null,
          claims_audit_passed: score?.claims_audit_passed || false,
          claims_ledger: score?.claims_ledger || [],
          judge_feedback: score?.feedback || null,
          generation_model: 'claude-sonnet-4-20250514',
          status: 'generated',
        })
        .select()
        .single();

      if (savedDraft) savedDrafts.push(savedDraft);
    }

    // 7. Update prospect status
    await supabase
      .from('prospects')
      .update({ status: 'drafted', updated_at: new Date().toISOString() })
      .eq('id', params.id);

    // 8. Cost estimate
    const totalInputTokens = (extractUsage?.input_tokens || 0) + (draftUsage?.input_tokens || 0) + (judgeUsage?.input_tokens || 0);
    const totalOutputTokens = (extractUsage?.output_tokens || 0) + (draftUsage?.output_tokens || 0) + (judgeUsage?.output_tokens || 0);
    const costEstimate = (totalInputTokens * 0.003 + totalOutputTokens * 0.015) / 1000;

    return NextResponse.json({
      status: 'completed',
      prospect_id: params.id,
      drafts_count: savedDrafts.length,
      artifacts_count: artifacts.length,
      drafts: savedDrafts,
      usage: {
        extract: extractUsage,
        draft: draftUsage,
        judge: judgeUsage,
        total_input_tokens: totalInputTokens,
        total_output_tokens: totalOutputTokens,
      },
      cost_estimate: `$${costEstimate.toFixed(4)}`,
    });

  } catch (err: any) {
    console.error('Draft generation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/prospects/[id]/drafts/generate
// Returns existing drafts for this prospect
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { data: drafts, error } = await supabase
    .from('drafts')
    .select('*')
    .eq('prospect_id', params.id)
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ drafts: drafts || [] });
}
