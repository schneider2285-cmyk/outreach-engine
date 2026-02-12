/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState } from 'react';

const EXAMPLE_PAYLOAD = {
  channel: 'email',
  prospect_name: 'Jessica',
  prospect_title: 'VP of Digital Transformation',
  company: 'Schneider Electric',
  seniority: 'VP',
  verified_triggers: [
    { text: 'EcoStruxure ESG data management expansion', evidence_id: 't1' },
  ],
  role_pain_hypothesis:
    'Scaling ESG reporting usually hits data fragmentation across sites and entities.',
  your_proof_points: [
    { text: 'Approved partner through the Global Freelancing Program', evidence_id: 'p1' },
    { text: 'Supported 100+ projects across SE', evidence_id: 'p2' },
  ],
  role_types_you_cover: ['data engineers', 'ML engineers'],
  signature_name: 'Matt',
};

interface GateVerdict { verdict: string; probability: number; reason: string; killer: string | null; drop_off_line?: string | null; }

interface DraftResult {
  variant_number: number; channel: string; subject: string | null; body: string;
  hook_type: string; angle: string; cta_type: string; was_rewritten: boolean;
  empathy_gate: {
    passes: boolean; weakest_gate: number;
    gate_1: GateVerdict; gate_2: GateVerdict; gate_3: GateVerdict;
    perceived_intent: string; perceived_relevance: string; inbox_comparison: string;
    top_3_reasons_to_ignore: string[]; what_would_make_me_respond: string;
    used_evidence_ids: string[]; unsupported_claims: string[];
    rewrite_actions: { gate: number; action: string; detail: string }[];
  };
  scores: { open: number; read: number; reply: number };
  original_gate?: { passes: boolean; weakest_gate: number; gate_1: string; gate_2: string; gate_3: string; };
}

interface QuickDraftResponse {
  status: string;
  prospect: { name: string; company: string; channel: string };
  summary: { total_drafts: number; passed: number; failed: number; rewritten: number };
  drafts: DraftResult[]; tokens: { input: number; output: number };
  cost_estimate: string; error?: string;
}

function gateIcon(v: string): string {
  const u = v?.toUpperCase();
  if (u === 'OPEN' || u === 'READ' || u === 'RESPOND') return '\u2705';
  if (u === 'MAYBE' || u === 'SKIM' || u === 'SAVE') return '\u26A0\uFE0F';
  return '\u274C';
}

function scoreBadge(s: number) {
  if (s >= 70) return { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' };
  if (s >= 40) return { bg: 'rgba(234,179,8,0.15)', color: '#eab308' };
  return { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' };
}
export default function QuickDraftPage() {
  const [jsonInput, setJsonInput] = useState(JSON.stringify(EXAMPLE_PAYLOAD, null, 2));
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<QuickDraftResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedDraft, setExpandedDraft] = useState<number | null>(null);

  const handleGenerate = async () => {
    setGenerating(true); setError(null); setResult(null);
    try { JSON.parse(jsonInput); } catch { setError('Invalid JSON.'); setGenerating(false); return; }
    try {
      const res = await fetch('/api/quick-draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: jsonInput });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Generation failed');
      else setResult(data);
    } catch (err: any) { setError(err.message || 'Network error'); }
    setGenerating(false);
  };

  return (
    <div>
      <div style={{ marginBottom: 4 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Quick Draft</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>Paste your prospect intel, get empathy-gate-scored drafts instantly. No database, no research step.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700 }}>Prospect Payload</h2>
            <button onClick={() => setJsonInput(JSON.stringify(EXAMPLE_PAYLOAD, null, 2))} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>Load Example</button>
          </div>
          <textarea value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} spellCheck={false} style={{ width: '100%', height: 380, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6, padding: 14, resize: 'vertical', outline: 'none' }} />
          <button onClick={handleGenerate} disabled={generating} style={{ marginTop: 12, width: '100%', background: generating ? 'var(--bg-hover)' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 700, cursor: generating ? 'wait' : 'pointer', opacity: generating ? 0.7 : 1 }}>{generating ? 'Generating + Scoring...' : 'Generate Drafts'}</button>
        </div>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Payload Schema</h2>
          <div style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
            {[
              { field: 'channel', req: true, desc: 'email | linkedin | connection_note' },
              { field: 'prospect_name', req: true, desc: 'First name of the prospect' },
              { field: 'company', req: true, desc: 'Company name' },
              { field: 'prospect_title', req: false, desc: 'Job title' },
              { field: 'seniority', req: false, desc: 'VP, Director, Manager, etc.' },
              { field: 'verified_triggers', req: false, desc: 'Array of { text, evidence_id }' },
              { field: 'role_pain_hypothesis', req: false, desc: 'Your pain hypothesis' },
              { field: 'your_proof_points', req: false, desc: 'Array of { text, evidence_id }' },
              { field: 'role_types_you_cover', req: false, desc: 'Array of role types you place' },
              { field: 'signature_name', req: false, desc: 'Your first name for sign-off' },
              { field: 'linkedin_tone', req: false, desc: 'Observed communication tone' },
              { field: 'additional_context', req: false, desc: 'Anything else relevant' },
            ].map((item) => (
              <div key={item.field} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <code style={{ fontFamily: 'monospace', color: item.req ? '#22c55e' : 'var(--text-muted)', minWidth: 170, fontSize: 11 }}>{item.field}{item.req ? ' *' : ''}</code>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{item.desc}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>Pipeline: Generate 3 drafts, Empathy Gate each, Auto-rewrite failures, Re-score rewrites. Nothing saved to DB.</div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }}>&times;</button>
        </div>
      )}
      {result && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'DRAFTS', value: result.summary.total_drafts, color: 'var(--accent-blue)' },
              { label: 'PASSED', value: result.summary.passed, color: '#22c55e' },
              { label: 'FAILED', value: result.summary.failed, color: '#ef4444' },
              { label: 'REWRITTEN', value: result.summary.rewritten, color: '#eab308' },
              { label: 'COST', value: result.cost_estimate, color: 'var(--text-muted)' },
            ].map((card) => (
              <div key={card.label} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1, color: 'var(--text-muted)', marginTop: 2 }}>{card.label}</div>
              </div>
            ))}
          </div>

          {result.drafts.map((draft) => {
            const gate = draft.empathy_gate;
            const isExpanded = expandedDraft === draft.variant_number;
            const borderColor = gate.passes ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)';
            return (
              <div key={draft.variant_number} style={{ background: 'var(--bg-secondary)', border: '1px solid ' + borderColor, borderRadius: 10, padding: 20, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>Variant {draft.variant_number}</span>
                    <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: gate.passes ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: gate.passes ? '#22c55e' : '#ef4444' }}>{gate.passes ? 'PASS' : 'FAIL'}</span>
                    {draft.was_rewritten && <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: 'rgba(234,179,8,0.15)', color: '#eab308' }}>Rewritten</span>}
                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: 'rgba(100,100,255,0.15)', color: '#8888ff' }}>{draft.hook_type}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[{ label: 'G1', v: gate.gate_1 }, { label: 'G2', v: gate.gate_2 }, { label: 'G3', v: gate.gate_3 }].map((g) => (
                      <span key={g.label} style={{ fontSize: 11, color: 'var(--text-muted)' }}>{g.label}: {gateIcon(g.v?.verdict)} {g.v?.probability}%</span>
                    ))}
                  </div>
                </div>
                {draft.subject && <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>Subject: {draft.subject}</div>}
                <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 12 }}>{draft.body}</div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  {[{ label: 'Open', score: draft.scores.open }, { label: 'Read', score: draft.scores.read }, { label: 'Reply', score: draft.scores.reply }].map((s) => {
                    const b = scoreBadge(s.score);
                    return <span key={s.label} style={{ padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: b.bg, color: b.color }}>{s.label}: {s.score}</span>;
                  })}
                </div>

                {gate.what_would_make_me_respond && (
                  <div style={{ fontSize: 12, color: '#22c55e', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, padding: '8px 12px', marginBottom: 10 }}>
                    <strong>What would make me respond:</strong> {gate.what_would_make_me_respond}
                  </div>
                )}

                <button onClick={() => setExpandedDraft(isExpanded ? null : draft.variant_number)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer' }}>{isExpanded ? 'Hide Details' : 'Show Gate Details'}</button>

                {isExpanded && (
                  <div style={{ marginTop: 14, fontSize: 12, lineHeight: 1.7 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div><div style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Perceived Intent</div><div style={{ color: 'var(--text-secondary)' }}>{gate.perceived_intent}</div></div>
                      <div><div style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Perceived Relevance</div><div style={{ color: 'var(--text-secondary)' }}>{gate.perceived_relevance}</div></div>
                    </div>
                    <div style={{ marginBottom: 12 }}><div style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Inbox Comparison</div><div style={{ color: 'var(--text-secondary)' }}>{gate.inbox_comparison}</div></div>                    {gate.top_3_reasons_to_ignore?.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: 4 }}>Reasons to Ignore</div>
                        {gate.top_3_reasons_to_ignore.map((r: string, i: number) => (<div key={i} style={{ color: 'var(--text-muted)', paddingLeft: 8 }}>{i + 1}. {r}</div>))}
                      </div>
                    )}
                    {gate.unsupported_claims?.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: 4 }}>Unsupported Claims</div>
                        {gate.unsupported_claims.map((c: string, i: number) => (<div key={i} style={{ color: '#ef4444', paddingLeft: 8 }}>{c}</div>))}
                      </div>
                    )}
                    {gate.rewrite_actions?.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ color: '#eab308', fontWeight: 600, marginBottom: 4 }}>Rewrite Actions</div>
                        {gate.rewrite_actions.map((a: any, i: number) => (<div key={i} style={{ color: 'var(--text-muted)', paddingLeft: 8 }}>Gate {a.gate}: {a.action} - {a.detail}</div>))}
                      </div>
                    )}
                    {gate.used_evidence_ids?.length > 0 && (
                      <div><div style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Evidence Used</div><div style={{ color: 'var(--text-secondary)' }}>{gate.used_evidence_ids.join(', ')}</div></div>
                    )}
                    <div style={{ marginTop: 14 }}>
                      {[{ label: 'Gate 1 (Open)', data: gate.gate_1 }, { label: 'Gate 2 (Read)', data: gate.gate_2 }, { label: 'Gate 3 (Respond)', data: gate.gate_3 }].map((g) => (
                        <div key={g.label} style={{ marginBottom: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, border: '1px solid var(--border)' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{gateIcon(g.data?.verdict)} {g.label}: {g.data?.verdict} ({g.data?.probability}%)</div>
                          <div style={{ color: 'var(--text-muted)' }}>{g.data?.reason}</div>
                          {g.data?.killer && <div style={{ color: '#ef4444', marginTop: 2 }}>Killer: {g.data.killer}</div>}
                        </div>
                      ))}
                    </div>
                    {draft.was_rewritten && draft.original_gate && (
                      <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 6 }}>
                        <div style={{ fontWeight: 600, color: '#eab308', marginBottom: 4 }}>Original (Pre-Rewrite)</div>
                        <div style={{ color: 'var(--text-muted)' }}>Passed: {draft.original_gate.passes ? 'Yes' : 'No'} | Weakest: Gate {draft.original_gate.weakest_gate} | G1: {draft.original_gate.gate_1} | G2: {draft.original_gate.gate_2} | G3: {draft.original_gate.gate_3}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Tokens: {result.tokens.input.toLocaleString()} in / {result.tokens.output.toLocaleString()} out</span>
            <span>Estimated cost: {result.cost_estimate}</span>
          </div>
        </div>
      )}
    </div>
  );
}
