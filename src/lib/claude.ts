// Claude API client for extraction, drafting, and judge scoring
// Phase 3: Wire up Claude API for draft generation and judge scoring

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
- Variant 3: Peer-proof hook (reference similar companies/roles you've helped)

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

// --- JUDGE: Score and audit drafts ---

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
  const system = `You are a strict B2B outreach quality judge. You score drafts on deliverability, readability, and reply likelihood. You also audit factual claims against provided evidence. Return valid JSON only.`;

  const prompt = `Score these outreach drafts for ${prospectName} at ${accountName}.

DRAFTS:
${drafts.map(d => `--- Variant ${d.variant_number} ---
${d.subject ? `Subject: ${d.subject}\n` : ''}Body: ${d.body}
Hook: ${d.hook_type} | Angle: ${d.angle}`).join('\n\n')}

EVIDENCE (for claims verification):
${evidenceSnippets.slice(0, 5).map((s, i) => `[${i + 1}] ${s.substring(0, 300)}`).join('\n')}

For each variant, provide:
1. open_score (1-100): Will the subject/first line make them open/read?
2. read_score (1-100): Will they read the full message?
3. reply_score (1-100): Will they reply?
4. claims_audit_passed (boolean): Are all factual claims supported by evidence?
5. claims_ledger: Array of { claim, verified, source? } for each factual claim made
6. feedback: One sentence on how to improve

Return a JSON array of objects with fields: variant_number, open_score, read_score, reply_score, claims_audit_passed, claims_ledger, feedback.

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
