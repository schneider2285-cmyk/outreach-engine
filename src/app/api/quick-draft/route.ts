import { NextRequest, NextResponse } from 'next/server';
import { generateDrafts, empathyGate, rewriteDraft, voiceLint, ProfileArtifact, DraftOutput } from '@/lib/claude';

// POST /api/quick-draft
// Pipeline: Generate drafts -> Voice Lint -> Auto-rewrite lint failures -> Empathy Gate -> Auto-rewrite gate failures -> Re-score

interface QuickDraftInput {
  channel: 'email' | 'linkedin' | 'connection_note';
  prospect_name: string; prospect_title?: string; company: string; seniority?: string;
  verified_triggers?: { text: string; evidence_id: string }[];
  role_pain_hypothesis?: string;
  your_proof_points?: { text: string; evidence_id: string }[];
  role_types_you_cover?: string[]; signature_name?: string;
  linkedin_tone?: string; additional_context?: string;
}

export async function POST(request: NextRequest) {
  let input: QuickDraftInput;
  try { input = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 }); }
  if (!input.prospect_name || !input.company || !input.channel) {
    return NextResponse.json({ error: 'Missing required fields: prospect_name, company, channel' }, { status: 400 });
  }

  try {
    const artifacts: ProfileArtifact[] = [];
    artifacts.push({ artifact_type: 'role_summary', content: { summary: input.prospect_name + ' at ' + input.company, responsibilities: [input.role_pain_hypothesis || 'enterprise operations'], key_initiatives: (input.verified_triggers || []).map(t => t.text) } });
    if (input.verified_triggers?.length) artifacts.push({ artifact_type: 'trigger_events', content: { events: input.verified_triggers.map(t => ({ event: t.text, date_approx: 'recent', relevance: 'high' })) } });
    if (input.role_pain_hypothesis) artifacts.push({ artifact_type: 'pain_points', content: { pains: [{ topic: input.role_pain_hypothesis, description: input.role_pain_hypothesis, evidence_index: 1 }] } });
    artifacts.push({ artifact_type: 'communication_style', content: { tone: input.linkedin_tone || 'professional', formality: 'business', interests: [], preferred_topics: (input.verified_triggers || []).map(t => t.text) } });
    if (input.your_proof_points?.length) artifacts.push({ artifact_type: 'connection_hooks', content: { hooks: input.your_proof_points.map(p => ({ type: 'proof_point', detail: p.text, angle: 'credibility' })) } });

    const evidenceSnippets: string[] = [];
    input.verified_triggers?.forEach(t => evidenceSnippets.push('[' + t.evidence_id + '] ' + t.text));
    input.your_proof_points?.forEach(p => evidenceSnippets.push('[' + p.evidence_id + '] ' + p.text));
    if (input.role_pain_hypothesis) evidenceSnippets.push('[pain] ' + input.role_pain_hypothesis);
    if (input.role_types_you_cover?.length) evidenceSnippets.push('[coverage] Role types: ' + input.role_types_you_cover.join(', '));
    if (input.signature_name) evidenceSnippets.push('[sender] Sender name: ' + input.signature_name);

    const draftChannel = input.channel === 'connection_note' ? 'linkedin' : input.channel;
    const { drafts: draftOutputs, usage: draftUsage } = await generateDrafts(input.prospect_name, input.prospect_title, input.company, undefined, artifacts, draftChannel as 'email' | 'linkedin', 3);

    // Voice Lint + auto-rewrite lint failures
    let totalLintRewriteUsage = { input_tokens: 0, output_tokens: 0 };
    const lintedDrafts: DraftOutput[] = [];
    for (const draft of draftOutputs) {
      const lint = voiceLint(draft, input.prospect_name, input.company);
      if (!lint.passed) {
        const fixInstr = 'Voice lint failures: ' + lint.violations.join('; ') + '. Remove all violating content and re-render strictly within the template.';
        const { draft: rewritten, usage: rwU } = await rewriteDraft(draft, null, input.prospect_name, input.prospect_title, input.company, artifacts, fixInstr);
        totalLintRewriteUsage.input_tokens += rwU?.input_tokens || 0;
        totalLintRewriteUsage.output_tokens += rwU?.output_tokens || 0;
        lintedDrafts.push(rewritten);
      } else {
        lintedDrafts.push(draft);
      }
    }
    // Empathy Gate + auto-rewrite loop
    let totalGateUsage = { input_tokens: 0, output_tokens: 0 };
    let totalRewriteUsage = { input_tokens: 0, output_tokens: 0 };
    const finalDrafts: any[] = [];

    for (const draft of lintedDrafts) {
      const lintResult = voiceLint(draft, input.prospect_name, input.company);
      const { result: gate, usage: gU } = await empathyGate(draft, input.prospect_name, input.prospect_title, input.company, input.seniority, artifacts, evidenceSnippets, input.channel);
      totalGateUsage.input_tokens += gU?.input_tokens || 0;
      totalGateUsage.output_tokens += gU?.output_tokens || 0;

      if (!gate.passes && gate.rewrite_actions?.length > 0) {
        const { draft: rewritten, usage: rwU } = await rewriteDraft(draft, gate, input.prospect_name, input.prospect_title, input.company, artifacts);
        totalRewriteUsage.input_tokens += rwU?.input_tokens || 0;
        totalRewriteUsage.output_tokens += rwU?.output_tokens || 0;
        const { result: reGate, usage: reGU } = await empathyGate(rewritten, input.prospect_name, input.prospect_title, input.company, input.seniority, artifacts, evidenceSnippets, input.channel);
        totalGateUsage.input_tokens += reGU?.input_tokens || 0;
        totalGateUsage.output_tokens += reGU?.output_tokens || 0;
        finalDrafts.push({ draft: rewritten, gate: reGate, was_rewritten: true, voice_lint: lintResult, original_gate: { passes: gate.passes, weakest_gate: gate.weakest_gate, gate_1: gate.gate_1_open?.verdict, gate_2: gate.gate_2_read?.verdict, gate_3: gate.gate_3_respond?.verdict } });
      } else {
        finalDrafts.push({ draft, gate, was_rewritten: false, voice_lint: lintResult });
      }
    }

    const totalIn = (draftUsage?.input_tokens || 0) + totalGateUsage.input_tokens + totalRewriteUsage.input_tokens + totalLintRewriteUsage.input_tokens;
    const totalOut = (draftUsage?.output_tokens || 0) + totalGateUsage.output_tokens + totalRewriteUsage.output_tokens + totalLintRewriteUsage.output_tokens;

    return NextResponse.json({
      status: 'completed',
      prospect: { name: input.prospect_name, company: input.company, channel: input.channel },
      summary: { total_drafts: finalDrafts.length, passed: finalDrafts.filter((d: any) => d.gate.passes).length, failed: finalDrafts.filter((d: any) => !d.gate.passes).length, rewritten: finalDrafts.filter((d: any) => d.was_rewritten).length },
      drafts: finalDrafts.map((item: any) => ({
        variant_number: item.draft.variant_number, channel: item.draft.channel,
        subject: item.draft.subject || null, body: item.draft.body,
        hook_type: item.draft.hook_type, angle: item.draft.angle, cta_type: item.draft.cta_type,
        was_rewritten: item.was_rewritten,
        voice_lint: item.voice_lint,
        empathy_gate: {
          passes: item.gate.passes, weakest_gate: item.gate.weakest_gate,
          gate_1: item.gate.gate_1_open, gate_2: item.gate.gate_2_read, gate_3: item.gate.gate_3_respond,
          perceived_intent: item.gate.perceived_intent, perceived_relevance: item.gate.perceived_relevance,
          inbox_comparison: item.gate.inbox_comparison,
          top_3_reasons_to_ignore: item.gate.top_3_reasons_to_ignore,
          what_would_make_me_respond: item.gate.what_would_make_me_respond,
          used_evidence_ids: item.gate.used_evidence_ids, unsupported_claims: item.gate.unsupported_claims,
          rewrite_actions: item.gate.rewrite_actions,
        },
        scores: { open: item.gate.open_score, read: item.gate.read_score, reply: item.gate.reply_score },
        ...(item.was_rewritten ? { original_gate: item.original_gate } : {}),
      })),
      tokens: { input: totalIn, output: totalOut },
      cost_estimate: '$' + ((totalIn * 0.003 + totalOut * 0.015) / 1000).toFixed(4),
    });
  } catch (err: any) {
    console.error('Quick draft error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}import { NextRequest, NextResponse } from 'next/server';
import { generateDrafts, empathyGate, rewriteDraft, ProfileArtifact, DraftOutput } from '@/lib/claude';

// POST /api/quick-draft
// Standalone draft generation + Empathy Gate — no database, no Perplexity
// Accepts a JSON payload with prospect context and returns scored drafts

interface QuickDraftInput {
    channel: 'email' | 'linkedin' | 'connection_note';
    prospect_name: string;
    prospect_title?: string;
    company: string;
    seniority?: string;
    verified_triggers?: { text: string; evidence_id: string }[];
    role_pain_hypothesis?: string;
    your_proof_points?: { text: string; evidence_id: string }[];
    role_types_you_cover?: string[];
    signature_name?: string;
    linkedin_tone?: string;
    additional_context?: string;
}

export async function POST(request: NextRequest) {
    let input: QuickDraftInput;
    try {
          input = await request.json();
    } catch {
          return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

  // Validate required fields
  if (!input.prospect_name || !input.company || !input.channel) {
        return NextResponse.json({
                error: 'Missing required fields: prospect_name, company, channel',
                example: {
                          channel: 'email',
                          prospect_name: 'Jessica',
                          company: 'Schneider Electric',
                          verified_triggers: [{ text: 'EcoStruxure expansion', evidence_id: 't1' }],
                          role_pain_hypothesis: 'Scaling ESG reporting hits data fragmentation.',
                          your_proof_points: [{ text: 'Approved partner', evidence_id: 'p1' }],
                          role_types_you_cover: ['data engineers', 'ML engineers'],
                          signature_name: 'Matt',
                },
        }, { status: 400 });
  }

  try {
        // Build synthetic artifacts from the user's input
      const artifacts: ProfileArtifact[] = [];

      // Role summary
      artifacts.push({
              artifact_type: 'role_summary',
              content: {
                        summary: `${input.prospect_name} at ${input.company}`,
                        responsibilities: [input.role_pain_hypothesis || 'enterprise operations'],
                        key_initiatives: input.verified_triggers?.map(t => t.text) || [],
              },
      });

      // Trigger events
      if (input.verified_triggers?.length) {
              artifacts.push({
                        artifact_type: 'trigger_events',
                        content: {
                                    events: input.verified_triggers.map(t => ({
                                                  event: t.text,
                                                  date_approx: 'recent',
                                                  relevance: 'high',
                                    })),
                        },
              });
      }

      // Pain points
      if (input.role_pain_hypothesis) {
              artifacts.push({
                        artifact_type: 'pain_points',
                        content: {
                                    pains: [{ topic: input.role_pain_hypothesis, description: input.role_pain_hypothesis, evidence_index: 1 }],
                        },
              });
      }

      // Communication style
      artifacts.push({
              artifact_type: 'communication_style',
              content: {
                        tone: input.linkedin_tone || 'professional',
                        formality: 'business',
                        interests: [],
                        preferred_topics: input.verified_triggers?.map(t => t.text) || [],
              },
      });

      // Connection hooks from proof points
      if (input.your_proof_points?.length) {
              artifacts.push({
                        artifact_type: 'connection_hooks',
                        content: {
                                    hooks: input.your_proof_points.map(p => ({
                                                  type: 'proof_point',
                                                  detail: p.text,
                                                  angle: 'credibility',
                                    })),
                        },
              });
      }

      // Build evidence snippets from triggers + proof points
      const evidenceSnippets: string[] = [];
        input.verified_triggers?.forEach(t => {
                evidenceSnippets.push(`[${t.evidence_id}] ${t.text}`);
        });
        input.your_proof_points?.forEach(p => {
                evidenceSnippets.push(`[${p.evidence_id}] ${p.text}`);
        });
        if (input.role_pain_hypothesis) {
                evidenceSnippets.push(`[pain] ${input.role_pain_hypothesis}`);
        }
        if (input.role_types_you_cover?.length) {
                evidenceSnippets.push(`[coverage] Role types: ${input.role_types_you_cover.join(', ')}`);
        }
        if (input.additional_context) {
                evidenceSnippets.push(`[context] ${input.additional_context}`);
        }

      // Add signature context to artifacts
      if (input.signature_name) {
              evidenceSnippets.push(`[sender] Sender name: ${input.signature_name}`);
      }

      const draftChannel = input.channel === 'connection_note' ? 'linkedin' : input.channel;

      // Step 1: Generate drafts
      const { drafts: draftOutputs, usage: draftUsage } = await generateDrafts(
              input.prospect_name,
              input.prospect_title,
              input.company,
              undefined,
              artifacts,
              draftChannel as 'email' | 'linkedin',
              3
            );

      // Step 2: Empathy Gate + auto-rewrite loop
      let totalGateUsage = { input_tokens: 0, output_tokens: 0 };
        let totalRewriteUsage = { input_tokens: 0, output_tokens: 0 };
        const finalDrafts: any[] = [];

      for (const draft of draftOutputs) {
              const { result: gate, usage: gU } = await empathyGate(
                        draft,
                        input.prospect_name,
                        input.prospect_title,
                        input.company,
                        input.seniority,
                        artifacts,
                        evidenceSnippets,
                        input.channel
                      );
              totalGateUsage.input_tokens += gU?.input_tokens || 0;
              totalGateUsage.output_tokens += gU?.output_tokens || 0;

          if (!gate.passes && gate.rewrite_actions?.length > 0) {
                    // Auto-rewrite
                const { draft: rewritten, usage: rwU } = await rewriteDraft(
                            draft, gate, input.prospect_name, input.prospect_title, input.company, artifacts
                          );
                    totalRewriteUsage.input_tokens += rwU?.input_tokens || 0;
                    totalRewriteUsage.output_tokens += rwU?.output_tokens || 0;

                // Re-score
                const { result: reGate, usage: reGU } = await empathyGate(
                            rewritten, input.prospect_name, input.prospect_title, input.company,
                            input.seniority, artifacts, evidenceSnippets, input.channel
                          );
                    totalGateUsage.input_tokens += reGU?.input_tokens || 0;
                    totalGateUsage.output_tokens += reGU?.output_tokens || 0;

                finalDrafts.push({
                            draft: rewritten,
                            gate: reGate,
                            was_rewritten: true,
                            original_gate: {
                                          passes: gate.passes,
                                          weakest_gate: gate.weakest_gate,
                                          gate_1: gate.gate_1_open?.verdict,
                                          gate_2: gate.gate_2_read?.verdict,
                                          gate_3: gate.gate_3_respond?.verdict,
                            },
                });
          } else {
                    finalDrafts.push({ draft, gate, was_rewritten: false });
          }
      }

      // Calculate costs
      const totalIn = (draftUsage?.input_tokens || 0) + totalGateUsage.input_tokens + totalRewriteUsage.input_tokens;
        const totalOut = (draftUsage?.output_tokens || 0) + totalGateUsage.output_tokens + totalRewriteUsage.output_tokens;

      return NextResponse.json({
              status: 'completed',
              prospect: { name: input.prospect_name, company: input.company, channel: input.channel },
              summary: {
                        total_drafts: finalDrafts.length,
                        passed: finalDrafts.filter(d => d.gate.passes).length,
                        failed: finalDrafts.filter(d => !d.gate.passes).length,
                        rewritten: finalDrafts.filter(d => d.was_rewritten).length,
              },
              drafts: finalDrafts.map(item => ({
                        variant_number: item.draft.variant_number,
                        channel: item.draft.channel,
                        subject: item.draft.subject || null,
                        body: item.draft.body,
                        hook_type: item.draft.hook_type,
                        angle: item.draft.angle,
                        cta_type: item.draft.cta_type,
                        was_rewritten: item.was_rewritten,
                        empathy_gate: {
                                    passes: item.gate.passes,
                                    weakest_gate: item.gate.weakest_gate,
                                    gate_1: item.gate.gate_1_open,
                                    gate_2: item.gate.gate_2_read,
                                    gate_3: item.gate.gate_3_respond,
                                    perceived_intent: item.gate.perceived_intent,
                                    perceived_relevance: item.gate.perceived_relevance,
                                    inbox_comparison: item.gate.inbox_comparison,
                                    top_3_reasons_to_ignore: item.gate.top_3_reasons_to_ignore,
                                    what_would_make_me_respond: item.gate.what_would_make_me_respond,
                                    used_evidence_ids: item.gate.used_evidence_ids,
                                    unsupported_claims: item.gate.unsupported_claims,
                                    rewrite_actions: item.gate.rewrite_actions,
                        },
                        scores: {
                                    open: item.gate.open_score,
                                    read: item.gate.read_score,
                                    reply: item.gate.reply_score,
                        },
                        ...(item.was_rewritten ? { original_gate: item.original_gate } : {}),
              })),
              tokens: { input: totalIn, output: totalOut },
              cost_estimate: `$${((totalIn * 0.003 + totalOut * 0.015) / 1000).toFixed(4)}`,
      });
  } catch (err: any) {
        console.error('Quick draft error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
