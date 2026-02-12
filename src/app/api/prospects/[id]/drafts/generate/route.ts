import { NextRequest, NextResponse } from 'next/server';
import { supabase, TENANT_ID } from '@/lib/supabase';
import { extractProfile, generateDrafts, empathyGate, rewriteDraft } from '@/lib/claude';

// POST /api/prospects/[id]/drafts/generate
// Phase 3.5: Full pipeline with Empathy Gate v1.2 + auto-rewrite
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const channel = body.channel || 'email';
  const numVariants = body.variants || 3;

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

  const { data: linkedinArtifacts } = await supabase
    .from('profile_artifacts')
    .select('artifact_type, content')
    .eq('prospect_id', params.id)
    .eq('tenant_id', TENANT_ID)
    .like('artifact_type', 'linkedin_%');

  let linkedinContext = '';
  if (linkedinArtifacts && linkedinArtifacts.length > 0) {
    linkedinContext = '\n\nLINKEDIN PROFILE DATA:\n';
    for (const a of linkedinArtifacts) {
      linkedinContext += a.artifact_type + ': ' + JSON.stringify(a.content).substring(0, 600) + '\n';
    }
  } else if (prospect.raw_linkedin_text) {
    linkedinContext = '\n\nLINKEDIN PROFILE:\n' + prospect.raw_linkedin_text.substring(0, 2000);
  }
  if (linkedinContext) evidenceSnippets.push(linkedinContext);

  try {
    const { artifacts, usage: extractUsage } = await extractProfile(
      prospect.full_name, prospect.title, accountName, evidenceSnippets
    );

    for (const artifact of artifacts) {
      await supabase.from('profile_artifacts').insert({
        tenant_id: TENANT_ID, prospect_id: params.id,
        artifact_type: artifact.artifact_type, content: artifact.content,
        source: 'claude_extraction',
      });
    }

    for (const artifact of artifacts) {
      await supabase.from('insights').insert({
        tenant_id: TENANT_ID, prospect_id: params.id,
        insight_type: artifact.artifact_type, content: artifact.content,
        confidence: 'high',
      });
    }

    const { drafts: draftOutputs, usage: draftUsage } = await generateDrafts(
      prospect.full_name, prospect.title, accountName,
      prospect.persona_segment, artifacts, channel, numVariants
    );

    // Empathy Gate + auto-rewrite loop
    let totalGateUsage = { input_tokens: 0, output_tokens: 0 };
    let totalRewriteUsage = { input_tokens: 0, output_tokens: 0 };
    const finalDrafts: any[] = [];

    for (const draft of draftOutputs) {
      const { result: gate, usage: gU } = await empathyGate(
        draft, prospect.full_name, prospect.title, accountName,
        prospect.seniority, artifacts, evidenceSnippets, channel
      );
      totalGateUsage.input_tokens += gU?.input_tokens || 0;
      totalGateUsage.output_tokens += gU?.output_tokens || 0;

      if (!gate.passes && gate.rewrite_actions?.length > 0) {
        const { draft: rewritten, usage: rwU } = await rewriteDraft(
          draft, gate, prospect.full_name, prospect.title, accountName, artifacts
        );
        totalRewriteUsage.input_tokens += rwU?.input_tokens || 0;
        totalRewriteUsage.output_tokens += rwU?.output_tokens || 0;

        const { result: reGate, usage: reGU } = await empathyGate(
          rewritten, prospect.full_name, prospect.title, accountName,
          prospect.seniority, artifacts, evidenceSnippets, channel
        );
        totalGateUsage.input_tokens += reGU?.input_tokens || 0;
        totalGateUsage.output_tokens += reGU?.output_tokens || 0;

        finalDrafts.push({ draft: rewritten, gate: reGate, was_rewritten: true });
      } else {
        finalDrafts.push({ draft, gate, was_rewritten: false });
      }
    }

    // Save drafts
    const savedDrafts = [];
    for (const item of finalDrafts) {
      const { draft, gate } = item;
      const { data: saved } = await supabase.from('drafts').insert({
        tenant_id: TENANT_ID, prospect_id: params.id,
        channel: draft.channel, variant_number: draft.variant_number,
        subject: draft.subject || null, body: draft.body,
        hook_type: draft.hook_type, angle: draft.angle,
        cta_type: draft.cta_type, length_bucket: draft.length_bucket,
        open_score: gate.open_score, read_score: gate.read_score,
        reply_score: gate.reply_score,
        claims_audit_passed: gate.claims_audit_passed,
        claims_ledger: gate.unsupported_claims?.map((c: string) => ({ claim: c, supported: false })) || [],
        judge_feedback: JSON.stringify({
          passes: gate.passes, weakest_gate: gate.weakest_gate,
          gate_1: gate.gate_1_open, gate_2: gate.gate_2_read, gate_3: gate.gate_3_respond,
          perceived_intent: gate.perceived_intent,
          perceived_relevance: gate.perceived_relevance,
          top_3_reasons_to_ignore: gate.top_3_reasons_to_ignore,
          what_would_make_me_respond: gate.what_would_make_me_respond,
          was_rewritten: item.was_rewritten,
        }),
        generation_model: 'claude-sonnet-4-20250514', status: 'generated',
      }).select().single();
      if (saved) savedDrafts.push(saved);
    }

    await supabase.from('prospects')
      .update({ status: 'drafted', updated_at: new Date().toISOString() })
      .eq('id', params.id);

    const totalIn = (extractUsage?.input_tokens || 0) + (draftUsage?.input_tokens || 0) +
      totalGateUsage.input_tokens + totalRewriteUsage.input_tokens;
    const totalOut = (extractUsage?.output_tokens || 0) + (draftUsage?.output_tokens || 0) +
      totalGateUsage.output_tokens + totalRewriteUsage.output_tokens;

    return NextResponse.json({
      status: 'completed', prospect_id: params.id,
      drafts_count: savedDrafts.length, artifacts_count: artifacts.length,
      linkedin_enriched: !!linkedinContext,
      empathy_gate: {
        passes: finalDrafts.filter(d => d.gate.passes).length,
        rewrites: finalDrafts.filter(d => d.was_rewritten).length,
        total: finalDrafts.length,
      },
      drafts: savedDrafts,
      cost_estimate: `$${((totalIn * 0.003 + totalOut * 0.015) / 1000).toFixed(4)}`,
    });
  } catch (err: any) {
    console.error('Draft generation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { data: drafts, error } = await supabase
    .from('drafts').select('*')
    .eq('prospect_id', params.id).eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ drafts: drafts || [] });
}
