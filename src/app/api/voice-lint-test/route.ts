import { NextResponse } from 'next/server';
import { generateDrafts, voiceLint, ProfileArtifact } from '@/lib/claude';

// GET /api/voice-lint-test
// Developer verification: generates a sample draft and asserts Matt Template Lock v1.3 constraints

export async function GET() {
  const sampleArtifacts: ProfileArtifact[] = [
    { artifact_type: 'role_summary', content: { summary: 'Jessica at Schneider Electric', responsibilities: ['digital transformation'], key_initiatives: ['EcoStruxure ESG data management expansion'] } },
    { artifact_type: 'trigger_events', content: { events: [{ event: 'EcoStruxure ESG data management expansion', date_approx: 'recent', relevance: 'high' }] } },
    { artifact_type: 'pain_points', content: { pains: [{ topic: 'Scaling ESG reporting usually hits data fragmentation across sites', description: 'data fragmentation', evidence_index: 1 }] } },
    { artifact_type: 'connection_hooks', content: { hooks: [{ type: 'proof_point', detail: 'engineers', angle: 'credibility' }] } },
  ];

  try {
    const { drafts, usage } = await generateDrafts('Jessica', 'VP of Digital Transformation', 'Schneider Electric', undefined, sampleArtifacts, 'email', 1);
    const draft = drafts[0];
    if (!draft) return NextResponse.json({ error: 'No draft generated' }, { status: 500 });

    const lint = voiceLint(draft, 'Jessica', 'Schneider Electric');
    const fullText = (draft.subject || '') + ' ' + draft.body;
    const wordCount = draft.body.split(/\s+/).filter(Boolean).length;
    const qCount = (fullText.match(/\?/g) || []).length;
    const hasDigits = /[0-9]/.test(fullText);
    const hasIdentityAnchor = draft.body.includes("lead Toptal") || draft.body.includes("partnership with");

    const assertions = [
      { name: 'identity_anchor', passed: hasIdentityAnchor, detail: 'Body must contain identity anchor line' },
      { name: 'exactly_one_question', passed: qCount === 1, detail: 'Found ' + qCount + ' question marks, expected 1' },
      { name: 'no_digits', passed: !hasDigits, detail: hasDigits ? 'Found digits in output' : 'No digits found' },
      { name: 'no_banned_words', passed: lint.violations.filter(v => v.startsWith('BANNED_WORD')).length === 0, detail: lint.violations.filter(v => v.startsWith('BANNED_WORD')).join(', ') || 'None' },
      { name: 'email_word_count_65_to_105', passed: wordCount >= 65 && wordCount <= 105, detail: 'Word count: ' + wordCount },
      { name: 'voice_lint_overall', passed: lint.passed, detail: lint.violations.join('; ') || 'All clear' },
    ];

    const allPassed = assertions.every(a => a.passed);

    return NextResponse.json({
      status: allPassed ? 'ALL_ASSERTIONS_PASSED' : 'SOME_ASSERTIONS_FAILED',
      draft: { subject: draft.subject, body: draft.body, channel: draft.channel, word_count: wordCount },
      voice_lint: lint,
      assertions,
      usage,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
