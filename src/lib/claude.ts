// Claude API client for extraction, drafting, and Empathy Gate scoring
// Phase 3.5: Empathy Gate v1.2 — prospect-persona judge with auto-rewrite

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  id: string;
  content: { type: string; text: string }[];
  usage: { input_tokens: number; output_tokens: number };
}

async function callClaude(
  messages: ClaudeMessage[],
  system: string,
  maxTokens: number = 2048
): Promise<{ text: string; usage: { input_tokens: number; output_tokens: number } }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error ${res.status}: ${errText}`);
  }

  const data: ClaudeResponse = await res.json();
  return {
    text: data.content?.[0]?.text || '',
    usage: data.usage,
  };
}

// --- EXTRACTION: Turn raw evidence into structured profile artifacts ---

export interface ProfileArtifact {
  artifact_type: string;
  content: Record<string, any>;
}

export async function extractProfile(
  prospectName: string,
  prospectTitle: string | undefined,
  accountName: string,
  evidenceSnippets: string[]
): Promise<{ artifacts: ProfileArtifact[]; usage: any }> {
  const system = `You are an expert B2B sales research analyst. Extract structured profile data from raw research evidence about a prospect. Return valid JSON only — no markdown, no explanation.`;

  const prompt = `Analyze this research about ${prospectName} (${prospectTitle || 'Unknown title'}) at ${accountName}.

EVIDENCE:
${evidenceSnippets.map((s, i) => `[${i + 1}] ${s}`).join('\n\n')}

Extract these profile artifacts as a JSON array. Each object has "artifact_type" and "content":

1. "role_summary" — content: { summary, responsibilities[], key_initiatives[] }
2. "pain_points" — content: { pains[] } where each pain has { topic, description, evidence_index }
3. "trigger_events" — content: { events[] } where each event has { event, date_approx, relevance }
4. "communication_style" — content: { tone, formality, interests[], preferred_topics[] }
5. "connection_hooks" — content: { hooks[] } where each hook has { type, detail, angle }

Return ONLY the JSON array. If evidence is insufficient for an artifact, include it with minimal content.`;

  const result = await callClaude([{ role: 'user', content: prompt }], system, 3000);

  let artifacts: ProfileArtifact[];
  try {
    const cleaned = result.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    artifacts = JSON.parse(cleaned);
  } catch {
    artifacts = [{ artifact_type: 'raw_extraction', content: { text: result.text } }];
  }

  return { artifacts, usage: result.usage };
}

// --- DRAFTING: Generate personalized outreach messages ---

export interface DraftOutput {
  channel: 'email' | 'linkedin';
  variant_number: number;
  subject?: string;
  body: string;
  hook_type: string;
  angle: string;
  cta_type: string;
  length_bucket: string;
}

export async function generateDrafts(
  prospectName: string,
  prospectTitle: string | undefined,
  accountName: string,
  personaSegment: string | undefined,
  artifacts: ProfileArtifact[],
  channel: 'email' | 'linkedin' = 'email',
  numVariants: number = 3
): Promise<{ drafts: DraftOutput[]; usage: any }> {
  const system = `You are an elite B2B outreach copywriter specializing in personalized cold outreach for staffing/consulting firms selling to enterprise buyers. Your messages are concise, insight-led, and never generic. Return valid JSON only.`;

  const artifactSummary = artifacts
    .map(a => `${a.artifact_type}: ${JSON.stringify(a.content).substring(0, 500)}`)
    .join('\n');

  const channelGuidance = channel === 'email'
    ? 'Email: Include subject line (max 50 chars). Body should be 75-150 words. Professional but warm tone.'
    : 'LinkedIn: No subject line needed. Message should be 50-100 words. Conversational, peer-to-peer tone.';

  const prompt = `Generate ${numVariants} personalized ${channel} outreach variants for:

PROSPECT: ${prospectName}, ${prospectTitle || 'Executive'} at ${accountName}
PERSONA: ${personaSegment || 'decision_maker'}

SENDER CONTEXT: Senior staffing/consulting partner who helps enterprises with digital transformation talent, SAP/ERP specialists, and technology consulting.

PROFILE INTELLIGENCE:
${artifactSummary}

${channelGuidance}

Each variant should use a DIFFERENT approach:
- Variant 1: Insight-led hook (reference a specific finding from research)
- Variant 2: Trigger-event hook (reference a recent change or initiative)
- Variant 3: Peer-proof hook (reference similar companies/roles you have helped)

Return a JSON array of objects with these fields:
- channel: "${channel}"
- variant_number: (1, 2, or 3)
- subject: (email only, omit for linkedin)
- body: the message text
- hook_type: "insight" | "trigger" | "peer_proof"
- angle: brief description of the angle used
- cta_type: "meeting" | "resource" | "intro" | "question"
- length_bucket: "short" | "medium" | "long"

Return ONLY the JSON array.`;

  const result = await callClaude([{ role: 'user', content: prompt }], system, 4000);

  let drafts: DraftOutput[];
  try {
    const cleaned = result.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    drafts = JSON.parse(cleaned);
  } catch {
    drafts = [{
      channel,
      variant_number: 1,
      body: result.text,
      hook_type: 'insight',
      angle: 'raw',
      cta_type: 'meeting',
      length_bucket: 'medium',
    }];
  }

  return { drafts, usage: result.usage };
}

// --- EMPATHY GATE v1.2: Prospect-persona judge ---

export interface EmpathyGateResult {
  variant_number: number;
  gate_1_open: { verdict: string; probability: number; reason: string; killer: string | null };
  gate_2_read: { verdict: string; probability: number; reason: string; killer: string | null; drop_off_line: string | null };
  gate_3_respond: { verdict: string; probability: number; reason: string; killer: string | null };
  passes: boolean;
  weakest_gate: number;
  perceived_intent: string;
  perceived_relevance: string;
  inbox_comparison: string;
  top_3_reasons_to_ignore: string[];
  what_would_make_me_respond: string;
  used_evidence_ids: string[];
  unsupported_claims: string[];
  rewrite_actions: { gate: number; action: string; detail: string }[];
  // Legacy compatibility scores derived from gate probabilities
  open_score: number;
  read_score: number;
  reply_score: number;
  claims_audit_passed: boolean;
  feedback: string;
}

export async function empathyGate(
  draft: DraftOutput,
  prospectName: string,
  prospectTitle: string | undefined,
  accountName: string,
  seniority: string | undefined,
  artifacts: ProfileArtifact[],
  evidenceSnippets: string[],
  channel: string
): Promise<{ result: EmpathyGateResult; usage: any }> {

  // Build prospect context from artifacts
  const roleArtifact = artifacts.find(a => a.artifact_type === 'role_summary' || a.artifact_type === 'linkedin_role');
  const painArtifact = artifacts.find(a => a.artifact_type === 'pain_points');
  const triggerArtifact = artifacts.find(a => a.artifact_type === 'trigger_events');
  const commArtifact = artifacts.find(a => a.artifact_type === 'communication_style');

  const verifiedInitiatives = roleArtifact?.content?.key_initiatives?.join(', ') || 'unknown';
  const triggerEvents = triggerArtifact?.content?.events?.map((e: any) => `${e.event} (${e.date_approx || 'recent'})`).join(', ') || 'none identified';
  const linkedinTone = commArtifact?.content?.tone || 'professional';
  const painHypotheses = painArtifact?.content?.pains?.map((p: any) => p.topic).join(', ') || 'unknown';
  const funcArea = roleArtifact?.content?.responsibilities?.[0] || 'enterprise operations';

  const evidenceBlock = evidenceSnippets.slice(0, 10).map((s, i) => `[E${i + 1}] ${s.substring(0, 300)}`).join('\n');

  const system = `RECIPIENT EMPATHY GATE v1.2

You are not a sales assistant. You are not an analyst. You are the prospect.

IDENTITY:
You are ${prospectName}, ${prospectTitle || 'Executive'} at ${accountName}.

YOUR CONTEXT (VERIFIED ONLY):
- Seniority: ${seniority || 'Senior'}
- Function: ${funcArea}
- Verified initiatives: ${verifiedInitiatives}
- Verified triggers: ${triggerEvents}
- Observed tone: ${linkedinTone}
- Role pain hypotheses: ${painHypotheses}

YOUR CURRENT STATE (PRIORS):
- Awareness: problem_aware
- Mode: execution
- Inbox tolerance: low
- Risk posture: risk_averse
- Likely objections: "too busy", "already have vendors", "not the right time"

EVIDENCE (for claims verification):
${evidenceBlock}

EVIDENCE RULES:
- You may only credit relevance claims if supported by evidence IDs above.
- If the message makes unsupported claims, list them in unsupported_claims and FAIL.
- List which evidence IDs were used in used_evidence_ids.

CHANNEL: ${channel}

TASK: Simulate your real inbox behavior using a 3-gate funnel.

BEHAVIORAL REALITY:
- You pattern-match sales outreach in 1-2 seconds. Default is ignore.
- You reward brevity, specificity, and low-pressure micro-commitments.
- You punish generic praise, capability lists, hype, and meeting asks in message 1.

GATE 1 (OPEN): Does subject/preview stand out from vendor noise? Concrete trigger or why-now?
GATE 2 (READ): Do first two lines prove this was written for me? Immediate relevance?
GATE 3 (RESPOND): Low-friction ask? No sales trap? Clear reason to respond now?

AUTOMATIC FAILS:
- Non-empty unsupported_claims = fail, must include needs_more_research action.
- More than one question = Gate 2/3 killer.
- Meeting ask in first touch = Gate 3 killer.

PASS RULES for ${channel}:
- email: gate_1=OPEN, gate_2=READ, gate_3=RESPOND
- linkedin_dm: gate_1=OPEN|MAYBE, gate_2=READ|SKIM, gate_3=RESPOND
- connection_note: gate_1=OPEN|MAYBE, gate_2=READ|SKIM, gate_3=RESPOND

Answer in first person as the prospect. Be blunt and time-protective.
Output ONLY valid JSON matching the schema. No markdown, no explanation.`;

  const messageContent = draft.subject
    ? `EMAIL SUBJECT: <<<${draft.subject}>>>
BODY: <<<${draft.body}>>>`
    : `MESSAGE: <<<${draft.body}>>>`;

  const prompt = `Score this outreach message:

${messageContent}

Hook type: ${draft.hook_type}
Angle: ${draft.angle}

Return JSON with this exact schema:
{
  "gate_1_open": { "verdict": "OPEN"|"MAYBE"|"SKIP", "probability": 0-100, "reason": "...", "killer": null|"..." },
  "gate_2_read": { "verdict": "READ"|"SKIM"|"STOP", "probability": 0-100, "reason": "...", "killer": null|"...", "drop_off_line": null|"..." },
  "gate_3_respond": { "verdict": "RESPOND"|"SAVE"|"DELETE", "probability": 0-100, "reason": "...", "killer": null|"..." },
  "passes": true|false,
  "weakest_gate": 1|2|3,
  "perceived_intent": "...",
  "perceived_relevance": "...",
  "inbox_comparison": "...",
  "top_3_reasons_to_ignore": ["...", "...", "..."],
  "what_would_make_me_respond": "...",
  "used_evidence_ids": ["E1", ...],
  "unsupported_claims": [],
  "rewrite_actions": [{ "gate": 1|2|3, "action": "...", "detail": "..." }]
}`;

  const result = await callClaude([{ role: 'user', content: prompt }], system, 3000);

  let gateResult: any;
  try {
    const cleaned = result.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    gateResult = JSON.parse(cleaned);
  } catch {
    gateResult = {
      gate_1_open: { verdict: 'MAYBE', probability: 50, reason: 'Could not parse', killer: null },
      gate_2_read: { verdict: 'SKIM', probability: 50, reason: 'Could not parse', killer: null, drop_off_line: null },
      gate_3_respond: { verdict: 'SAVE', probability: 30, reason: 'Could not parse', killer: null },
      passes: false,
      weakest_gate: 3,
      perceived_intent: 'unknown',
      perceived_relevance: 'unknown',
      inbox_comparison: 'unknown',
      top_3_reasons_to_ignore: ['Parse error'],
      what_would_make_me_respond: 'unknown',
      used_evidence_ids: [],
      unsupported_claims: [],
      rewrite_actions: [],
    };
  }

  // Derive legacy compatibility scores from gate probabilities
  const empathyResult: EmpathyGateResult = {
    variant_number: draft.variant_number,
    ...gateResult,
    open_score: gateResult.gate_1_open?.probability || 50,
    read_score: gateResult.gate_2_read?.probability || 50,
    reply_score: gateResult.gate_3_respond?.probability || 30,
    claims_audit_passed: (gateResult.unsupported_claims || []).length === 0,
    feedback: gateResult.what_would_make_me_respond || '',
  };

  return { result: empathyResult, usage: result.usage };
}

// --- REWRITE: Auto-rewrite a draft based on empathy gate feedback ---

export async function rewriteDraft(
  originalDraft: DraftOutput,
  gateResult: EmpathyGateResult,
  prospectName: string,
  prospectTitle: string | undefined,
  accountName: string,
  artifacts: ProfileArtifact[]
): Promise<{ draft: DraftOutput; usage: any }> {

  const system = `You are an elite B2B outreach rewriter. You receive a draft that FAILED an empathy gate test. Your job is to rewrite it to pass. Be concise, specific, and remove all vendor noise. Return valid JSON only.`;

  const rewriteInstructions = gateResult.rewrite_actions
    .map(a => `Gate ${a.gate} (${a.action}): ${a.detail}`)
    .join('\n');

  const artifactSummary = artifacts
    .slice(0, 3)
    .map(a => `${a.artifact_type}: ${JSON.stringify(a.content).substring(0, 300)}`)
    .join('\n');

  const prompt = `Rewrite this outreach message that failed the empathy gate.

ORIGINAL:
${originalDraft.subject ? `Subject: ${originalDraft.subject}` : ''}
Body: ${originalDraft.body}

PROSPECT: ${prospectName}, ${prospectTitle || 'Executive'} at ${accountName}

WHY IT FAILED:
- Weakest gate: ${gateResult.weakest_gate}
- Top reasons to ignore: ${gateResult.top_3_reasons_to_ignore?.join('; ')}
- What would make them respond: ${gateResult.what_would_make_me_respond}

REWRITE INSTRUCTIONS:
${rewriteInstructions}

PROFILE INTELLIGENCE:
${artifactSummary}

RULES:
- Keep the same channel (${originalDraft.channel}) and general angle
- Fix the specific issues identified
- No meeting asks in first touch — use micro-commitments
- Max one question
- Be specific and evidence-grounded

Return a JSON object:
{
  "channel": "${originalDraft.channel}",
  "variant_number": ${originalDraft.variant_number},
  "subject": "..." (email only),
  "body": "...",
  "hook_type": "${originalDraft.hook_type}",
  "angle": "...",
  "cta_type": "...",
  "length_bucket": "short"|"medium"
}`;

  const result = await callClaude([{ role: 'user', content: prompt }], system, 2000);

  let rewritten: DraftOutput;
  try {
    const cleaned = result.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    rewritten = JSON.parse(cleaned);
  } catch {
    rewritten = { ...originalDraft, body: result.text };
  }

  return { draft: rewritten, usage: result.usage };
}

// --- LEGACY WRAPPER: judgeDrafts (calls empathyGate for each draft) ---

export interface JudgeResult {
  variant_number: number;
  open_score: number;
  read_score: number;
  reply_score: number;
  claims_audit_passed: boolean;
  claims_ledger: { claim: string; verified: boolean; source?: string }[];
  feedback: string;
}

export async function judgeDrafts(
  drafts: DraftOutput[],
  prospectName: string,
  accountName: string,
  evidenceSnippets: string[]
): Promise<{ scores: JudgeResult[]; usage: any }> {
  // Legacy wrapper — uses simple scoring for backward compatibility
  const system = `You are a strict B2B outreach quality judge. Score drafts on deliverability, readability, and reply likelihood. Audit factual claims against evidence. Return valid JSON only.`;

  const prompt = `Score these outreach drafts for ${prospectName} at ${accountName}.

DRAFTS:
${drafts.map(d => `--- Variant ${d.variant_number} ---
${d.subject ? `Subject: ${d.subject}\n` : ''}Body: ${d.body}
Hook: ${d.hook_type} | Angle: ${d.angle}`).join('\n\n')}

EVIDENCE:
${evidenceSnippets.slice(0, 5).map((s, i) => `[${i + 1}] ${s.substring(0, 300)}`).join('\n')}

For each variant, provide:
1. open_score (1-100)
2. read_score (1-100)
3. reply_score (1-100)
4. claims_audit_passed (boolean)
5. claims_ledger: Array of { claim, verified, source? }
6. feedback: One sentence improvement suggestion

Return a JSON array with fields: variant_number, open_score, read_score, reply_score, claims_audit_passed, claims_ledger, feedback.
Return ONLY the JSON array.`;

  const result = await callClaude([{ role: 'user', content: prompt }], system, 3000);

  let scores: JudgeResult[];
  try {
    const cleaned = result.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    scores = JSON.parse(cleaned);
  } catch {
    scores = drafts.map(d => ({
      variant_number: d.variant_number,
      open_score: 50,
      read_score: 50,
      reply_score: 50,
      claims_audit_passed: false,
      claims_ledger: [],
      feedback: 'Could not parse judge response',
    }));
  }

  return { scores, usage: result.usage };
}
