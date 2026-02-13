// LinkedIn-specific outreach module
// Phase 4.1: LinkedIn Channel Overhaul
// Implements channel-specific generator, voice lint, and plan-based drafting

import { ProfileArtifact, DraftOutput, VoiceLintResult } from './claude';

// --- LINKEDIN SYSTEM PROMPT (separate from email MATT_VOICE_SYSTEM) ---
export const LINKEDIN_SYSTEM = `SYSTEM PROMPT — LINKEDIN DM GENERATOR — v1.0

You render LinkedIn DMs from a pre-built plan. You do NOT invent content.
You are given: trigger_line, relevance_line, identity_line, role_1, role_2, cta_line.
Your job is to assemble them into a 2-3 line message that sounds like a real human wrote it.

RULES:
- Output ONLY the final message text. No JSON, no labels, no markdown.
- 2-3 short lines total. Max 450 characters.
- Exactly ONE question mark (the CTA line).
- No insight words: patterns, framework, approaches, playbook, worth sharing, what we learned, lessons, architecture decisions, technical brief, competitive intelligence.
- No hedge phrase "from what I can tell" — kills authority.
- No presumptive language: "the hardest part is", "you are likely", "you must be dealing with".
- Company shorthand: first mention "Schneider Electric (SE)", subsequent mentions "SE".
- One softener max per relevance sentence: "it can be tough", "it can be hard", "I can imagine", "often".
- Roles must be specific (1-2 named roles). Never say "engineers and specialists".
- CTA is permission-based: asking to send a short menu/overview. Never "worth sharing" or "worth sending".
- No third-party company names.
- No numbers, metrics, or quantified outcomes.
- No flattery or compliments.
- No meeting ask.

STRUCTURE:
Line 1: trigger_line (one sentence, direct reference to one verified thing)
Line 2: relevance_line + identity_line (1-2 sentences)
Line 3: cta_line (the only question)

VOICE: Short, human, operator-to-operator. Like a colleague reaching out, not a vendor educating.

FINAL CHECK: If the output reads like a newsletter teaser or consultant note, rewrite internally.`;

// --- CONSTANTS ---

export const LINKEDIN_RELEVANCE_PHRASES = [
  'In builds like this, it can be tough to avoid short-term gaps without extra capacity.',
  'In a ramp like this, it can be hard to keep delivery moving without short burst coverage.',
  'When programs like this pick up, teams often need short-term help in a couple roles.',
  'In transitions like this, it can be tough to keep momentum without some short-term support.',
  'When initiatives like this scale up, it can be hard to fill gaps quickly enough.',
];

export const LINKEDIN_CTA_LIBRARY = [
  'Want me to send a 4-line role menu?',
  'Should I send a short role menu?',
  'Would it be useful if I sent a 4 to 5 line overview?',
  'Should I send a short role menu of where we can plug in?',
  'Want me to send a 4-line role menu for how we typically support teams here?',
];

export const LINKEDIN_ROLE_MAP: Record<string, { role_1: string; role_2: string }> = {
  technical: { role_1: 'data engineer', role_2: 'ML engineer' },
  platform: { role_1: 'platform engineer', role_2: 'data engineer' },
  product: { role_1: 'delivery lead', role_2: 'product delivery' },
  engineering: { role_1: 'data engineer', role_2: 'platform engineer' },
  data: { role_1: 'data engineer', role_2: 'ML engineer' },
  default: { role_1: 'delivery lead', role_2: 'TPM / program support' },
};

export const LINKEDIN_ALLOWED_ANGLES = [
  'partner_capacity_intro',
  'program_ramp_support',
  'role_transition_support',
];

// --- LINKEDIN PLAN INTERFACE ---

export interface LinkedInPlan {
  trigger_line: string;
  relevance_line: string;
  identity_line: string;
  role_1: string;
  role_2: string;
  cta_line: string;
  angle: string;
}

// --- BUILD LINKEDIN PLAN ---

export function buildLinkedInPlan(
  prospectName: string,
  accountName: string,
  personaSegment: string | undefined,
  artifacts: ProfileArtifact[],
  variantIndex: number
): LinkedInPlan {
  // 1. Build trigger line from artifacts
  const triggerArt = artifacts.find(a => a.artifact_type === 'trigger_events');
  const triggers = (triggerArt?.content?.events || []).slice(0, 5);
  const trigger = triggers[variantIndex % Math.max(triggers.length, 1)];
  const triggerText = trigger?.event || '';
  
  // Build simple trigger line - direct reference, no abstract language
  let trigger_line: string;
  if (triggerText) {
    // Apply SE shorthand: first mention is full name
    const companyRef = accountName.toLowerCase().includes('schneider') 
      ? 'Schneider Electric (SE)' : accountName;
    trigger_line = prospectName.split(' ')[0] + ', saw the ' + 
      triggerText.replace(/schneider electric/gi, '').replace(/\bat\b/gi, '').trim() + 
      ' work at ' + companyRef + '.';
  } else {
    const companyRef = accountName.toLowerCase().includes('schneider') 
      ? 'Schneider Electric (SE)' : accountName;
    trigger_line = prospectName.split(' ')[0] + ', noticed some of the recent work at ' + companyRef + '.';
  }

  // 2. Pick relevance line from phrase bank
  const relevance_line = LINKEDIN_RELEVANCE_PHRASES[variantIndex % LINKEDIN_RELEVANCE_PHRASES.length];

  // 3. Build identity line with SE shorthand (subsequent mention)
  const companyShort = accountName.toLowerCase().includes('schneider') ? 'SE' : accountName;
  const identity_line = "I lead Toptal's partnership with " + companyShort + 
    (variantIndex === 0 ? ' through the Global Freelancing Program.' : '.');

  // 4. Pick roles from mapping
  const persona = (personaSegment || 'default').toLowerCase();
  const roleEntry = LINKEDIN_ROLE_MAP[persona] || LINKEDIN_ROLE_MAP['default'];
  
  // 5. Pick CTA from library
  const cta_line = LINKEDIN_CTA_LIBRARY[variantIndex % LINKEDIN_CTA_LIBRARY.length];

  // 6. Pick angle
  const angle = LINKEDIN_ALLOWED_ANGLES[variantIndex % LINKEDIN_ALLOWED_ANGLES.length];

  return {
    trigger_line,
    relevance_line,
    identity_line,
    role_1: roleEntry.role_1,
    role_2: roleEntry.role_2,
    cta_line,
    angle,
  };
}

// --- LINKEDIN VOICE LINT ---

const LINKEDIN_BANNED_PHRASES = [
  'worth sharing',
  'worth sending',
  "what we've learned",
  'what we learned',
  'patterns',
  'approaches',
  'framework',
  'playbook',
  'from what i can tell',
  'ai-native',
  'ecosystem push',
  'integration bottleneck',
  'the hardest part is',
  'you are likely',
  'you must be dealing with',
  'lessons',
  'architecture decisions',
  'technical brief',
  'competitive intelligence',
  'deep dive',
  'brief',
];

const LINKEDIN_BANNED_ROLE_PHRASES = [
  'engineers and specialists',
  'engineers and experts',
  'talent and specialists',
];

export function linkedinVoiceLint(draft: DraftOutput): VoiceLintResult {
  const violations: string[] = [];
  const text = draft.body;
  const lower = text.toLowerCase();

  // 1. Check banned phrases
  for (const phrase of LINKEDIN_BANNED_PHRASES) {
    if (lower.includes(phrase)) {
      violations.push('LINKEDIN_BANNED: "' + phrase + '"');
    }
  }

  // 2. Check vague role language
  for (const phrase of LINKEDIN_BANNED_ROLE_PHRASES) {
    if (lower.includes(phrase)) {
      violations.push('VAGUE_ROLES: "' + phrase + '" - must name 1-2 specific roles');
    }
  }

  // 3. Max one question mark
  const qCount = (text.match(/\?/g) || []).length;
  if (qCount > 1) violations.push('MULTI_QUESTION: ' + qCount + ' question marks, max 1 allowed');
  if (qCount === 0) violations.push('NO_CTA: no question mark found, CTA required');

  // 4. Max 450 characters
  if (text.length > 450) violations.push('TOO_LONG: ' + text.length + ' chars, max 450');

  // 5. Identity anchor check
  if (!lower.includes('toptal') || (!lower.includes('partnership') && !lower.includes('partner'))) {
    violations.push('NO_IDENTITY: must include Toptal partnership/partner anchor');
  }

  // 6. Check for presumptive language
  if (lower.includes('the hardest part is')) violations.push('PRESUMPTIVE: "the hardest part is"');
  if (lower.includes('you are likely')) violations.push('PRESUMPTIVE: "you are likely"');
  if (lower.includes('you must be dealing')) violations.push('PRESUMPTIVE: "you must be dealing"');

  // 7. Check for insight/consulting angles that should be blocked
  if (lower.includes('insight')) violations.push('INSIGHT_ANGLE: contains "insight"');
  if (lower.includes('competitive')) violations.push('INSIGHT_ANGLE: contains "competitive"');

  return {
    passed: violations.length === 0,
    violations,
  };
}
