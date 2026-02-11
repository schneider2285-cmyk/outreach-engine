'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Prospect, Draft, Outcome, ResearchRun, WebEvidence, Insight, OutcomeType } from '@/types';

interface ProspectDetail {
  prospect: Prospect;
  drafts: Draft[];
  outcomes: Outcome[];
  research_runs: ResearchRun[];
  evidence: WebEvidence[];
  insights: Insight[];
}

export default function ProspectDetailPage() {
  const params = useParams();
  const prospectId = params.id as string;
  const [data, setData] = useState<ProspectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('overview');
  const [researchTier, setResearchTier] = useState<'quick' | 'standard' | 'deep'>('quick');
  const [researching, setResearching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [judging, setJudging] = useState<string | null>(null);
  const [outcomeForm, setOutcomeForm] = useState({ outcome_type: '' as OutcomeType | '', draft_id: '', notes: '' });
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);

  const load = () => {
    fetch(`/api/prospects/${prospectId}`)
      .then(r => {
        if (!r.ok) throw new Error('Prospect not found');
        return r.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [prospectId]);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>⏳ Loading prospect...</div>;
  if (error || !data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: 'var(--red)', marginBottom: 12 }}>{error || 'Prospect not found'}</div>
        <Link href="/prospects" className="btn btn-secondary">Back to Prospects</Link>
      </div>
    </div>
  );

  const { prospect, drafts, outcomes, research_runs, evidence, insights } = data;

  const runResearch = async () => {
    setResearching(true);
    await fetch(`/api/prospects/${prospectId}/research/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: researchTier }),
    });
    setTimeout(() => { setResearching(false); load(); }, 800);
  };

  const generateDrafts = async () => {
    setGenerating(true);
    await fetch(`/api/prospects/${prospectId}/drafts/generate`, { method: 'POST' });
    setTimeout(() => { setGenerating(false); load(); }, 800);
  };

  const judgeDraft = async (draftId: string) => {
    setJudging(draftId);
    const res = await fetch(`/api/drafts/${draftId}/judge`, { method: 'POST' });
    await res.json();
    setTimeout(() => { setJudging(null); load(); }, 600);
  };

  const logOutcome = async () => {
    if (!outcomeForm.outcome_type) return;
    await fetch(`/api/prospects/${prospectId}/outcomes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(outcomeForm),
    });
    setShowOutcomeModal(false);
    setOutcomeForm({ outcome_type: '', draft_id: '', notes: '' });
    load();
  };

  const scoreClass = (s?: number) => !s ? '' : s >= 70 ? 'score-high' : s >= 50 ? 'score-mid' : 'score-low';

  const tabs = ['overview', 'research', 'drafts', 'outcomes'];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <Link href={`/accounts/${prospect.account_id}`} style={{ fontSize: 12, color: 'var(--text-muted)' }}>← {prospect.account_name || 'Account'}</Link>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>{prospect.full_name}</h1>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>{prospect.title}</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            {prospect.location && <span>📍 {prospect.location}</span>}
            {prospect.seniority && <span>🎖️ {prospect.seniority}</span>}
            {prospect.department && <span>🏢 {prospect.department}</span>}
          </div>
        </div>
        <span className={`badge badge-${prospect.status}`}>{prospect.status}</span>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {tabs.map(t => (
          <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>{t}</div>
        ))}
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card">
            <h3 style={{ fontSize: 11, fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Profile</h3>
            <InfoRow label="Full Name" value={prospect.full_name} />
            <InfoRow label="Title" value={prospect.title} />
            <InfoRow label="Location" value={prospect.location} />
            <InfoRow label="Seniority" value={prospect.seniority} />
            <InfoRow label="Department" value={prospect.department} />
            <InfoRow label="LinkedIn" value={prospect.linkedin_url} isLink />
            <InfoRow label="Email" value={prospect.email} />
          </div>
          <div className="card">
            <h3 style={{ fontSize: 11, fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Intelligence</h3>
            <InfoRow label="BU Hypothesis" value={prospect.bu_hypothesis} />
            <InfoRow label="Persona Segment" value={prospect.persona_segment} />
            <InfoRow label="Research Runs" value={String(research_runs.length)} />
            <InfoRow label="Drafts" value={String(drafts.length)} />
            <InfoRow label="Outcomes Logged" value={String(outcomes.length)} />
          </div>
          {insights.length > 0 && (
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <h3 style={{ fontSize: 11, fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Insights</h3>
              {insights.map(ins => (
                <div key={ins.id} style={{ marginBottom: 12, padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{ins.insight_type.replace(/_/g, ' ')}</span>
                    <span className={`badge ${ins.confidence === 'high' ? 'badge-engaged' : ins.confidence === 'medium' ? 'badge-drafted' : 'badge-new'}`}>{ins.confidence}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {typeof ins.content === 'object' && 'summary' in ins.content
                      ? (ins.content as { summary: string }).summary
                      : JSON.stringify(ins.content)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== RESEARCH TAB ===== */}
      {tab === 'research' && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Run Research</h3>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              {(['quick', 'standard', 'deep'] as const).map(t => (
                <button key={t} className={`tier-btn ${researchTier === t ? 'active' : ''}`} onClick={() => setResearchTier(t)}>
                  {t === 'quick' ? '⚡ Quick' : t === 'standard' ? '🔍 Standard' : '🔬 Deep'}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              {researchTier === 'quick' && 'Max 2 searches. ~$0.01. Fast facts & role summary.'}
              {researchTier === 'standard' && 'Max 8 searches across source packs. ~$0.03. Full profile + BU mapping.'}
              {researchTier === 'deep' && 'Up to 15 searches. ~$0.09. Deep initiative mapping. Stops early if diminishing returns.'}
            </div>
            <button className="btn btn-primary" onClick={runResearch} disabled={researching}>
              {researching ? '⏳ Running...' : `Run ${researchTier} research`}
            </button>
          </div>

          {research_runs.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Research History</h3>
              <table className="data-table">
                <thead><tr><th>Tier</th><th>Status</th><th>Searches</th><th>Tokens</th><th>Cost</th><th>Date</th></tr></thead>
                <tbody>
                  {research_runs.map(r => (
                    <tr key={r.id}>
                      <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{r.tier}</td>
                      <td><span className={`badge ${r.status === 'completed' ? 'badge-engaged' : r.status === 'failed' ? 'badge-new' : 'badge-drafted'}`}>{r.status}</span></td>
                      <td>{r.search_count}</td>
                      <td>{r.token_count.toLocaleString()}</td>
                      <td style={{ color: 'var(--accent)' }}>${r.cost_estimate_usd.toFixed(3)}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(r.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {evidence.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Evidence ({evidence.length})</h3>
              {evidence.map(ev => (
                <div key={ev.id} style={{ marginBottom: 12, padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{ev.source_title || 'Source'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, lineHeight: 1.5 }}>{ev.snippet}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--blue)' }}>{ev.source_url}</span>
                    {ev.relevance_score && <span>Relevance: {(ev.relevance_score * 100).toFixed(0)}%</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== DRAFTS TAB ===== */}
      {tab === 'drafts' && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <button className="btn btn-primary" onClick={generateDrafts} disabled={generating}>
              {generating ? '⏳ Generating...' : '✨ Generate Drafts'}
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 12 }}>3 email + 2 LinkedIn variants</span>
          </div>

          {drafts.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✉️</div>
              <div style={{ fontSize: 13 }}>No drafts yet. Run research first, then generate drafts.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {drafts.map(d => (
                <div key={d.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className={`badge ${d.channel === 'email' ? 'badge-new' : 'badge-contacted'}`}>
                        {d.channel === 'email' ? '✉️ Email' : '💼 LinkedIn'} V{d.variant_number}
                      </span>
                      <span className={`badge ${d.status === 'approved' ? 'badge-engaged' : d.status === 'rejected' ? '' : 'badge-drafted'}`}>{d.status}</span>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => judgeDraft(d.id)} disabled={judging === d.id}>
                      {judging === d.id ? '⏳' : '⚖️ Judge'}
                    </button>
                  </div>
                  {d.subject && <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Subject: {d.subject}</div>}
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                    {d.body}
                  </div>
                  {/* Scores */}
                  {(d.open_score || d.read_score || d.reply_score) && (
                    <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 12 }}>
                      {d.open_score != null && <span>Open: <strong className={scoreClass(d.open_score)}>{d.open_score}</strong></span>}
                      <span>Read: <strong className={scoreClass(d.read_score)}>{d.read_score}</strong></span>
                      <span>Reply: <strong className={scoreClass(d.reply_score)}>{d.reply_score}</strong></span>
                      {d.claims_audit_passed != null && (
                        <span>Claims: <strong style={{ color: d.claims_audit_passed ? 'var(--accent)' : 'var(--red)' }}>{d.claims_audit_passed ? '✓ Pass' : '✗ Fail'}</strong></span>
                      )}
                    </div>
                  )}
                  {/* Metadata tags */}
                  {(d.hook_type || d.angle || d.cta_type) && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                      {d.hook_type && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>hook: {d.hook_type}</span>}
                      {d.angle && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>angle: {d.angle}</span>}
                      {d.cta_type && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>cta: {d.cta_type}</span>}
                      {d.length_bucket && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>length: {d.length_bucket}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== OUTCOMES TAB ===== */}
      {tab === 'outcomes' && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <button className="btn btn-primary" onClick={() => setShowOutcomeModal(true)}>📝 Log Outcome</button>
          </div>

          {outcomes.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 13 }}>No outcomes logged yet.</div>
            </div>
          ) : (
            <div className="card">
              <table className="data-table">
                <thead><tr><th>Type</th><th>Notes</th><th>Draft</th><th>Logged</th></tr></thead>
                <tbody>
                  {outcomes.map(o => (
                    <tr key={o.id}>
                      <td><OutcomeBadge type={o.outcome_type} /></td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{o.notes || '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{o.draft_id ? o.draft_id.slice(0, 8) : '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(o.logged_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Outcome modal */}
          {showOutcomeModal && (
            <div className="modal-overlay" onClick={() => setShowOutcomeModal(false)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Log Outcome</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label>Outcome Type *</label>
                    <select value={outcomeForm.outcome_type} onChange={e => setOutcomeForm(f => ({ ...f, outcome_type: e.target.value as OutcomeType }))}>
                      <option value="">Select...</option>
                      <option value="no_reply">No Reply</option>
                      <option value="positive">Positive</option>
                      <option value="neutral">Neutral</option>
                      <option value="objection">Objection</option>
                      <option value="not_relevant">Not Relevant</option>
                      <option value="referral">Referral</option>
                      <option value="unsubscribe">Unsubscribe</option>
                    </select>
                  </div>
                  {drafts.length > 0 && (
                    <div>
                      <label>Associated Draft (optional)</label>
                      <select value={outcomeForm.draft_id} onChange={e => setOutcomeForm(f => ({ ...f, draft_id: e.target.value }))}>
                        <option value="">None</option>
                        {drafts.map(d => (
                          <option key={d.id} value={d.id}>{d.channel} V{d.variant_number} — {d.subject || d.body.slice(0, 40)}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label>Notes</label>
                    <textarea rows={3} value={outcomeForm.notes} onChange={e => setOutcomeForm(f => ({ ...f, notes: e.target.value }))} placeholder="Details about the response..." />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                  <button className="btn btn-secondary" onClick={() => setShowOutcomeModal(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={logOutcome}>Log Outcome</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, isLink }: { label: string; value?: string | null; isLink?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      {isLink && value ? (
        <span style={{ fontSize: 12, color: 'var(--blue)' }}>{value}</span>
      ) : (
        <span style={{ color: 'var(--text-secondary)' }}>{value || '—'}</span>
      )}
    </div>
  );
}

function OutcomeBadge({ type }: { type: OutcomeType }) {
  const colors: Record<OutcomeType, { bg: string; text: string }> = {
    positive: { bg: '#1a3a2a', text: '#3ddc84' },
    neutral: { bg: '#3a2e1a', text: '#fbbf24' },
    no_reply: { bg: '#1e2a3a', text: '#6b7280' },
    objection: { bg: '#3a1a1a', text: '#ef4444' },
    not_relevant: { bg: '#2a1a2a', text: '#9ca3af' },
    referral: { bg: '#1a2a3a', text: '#60a5fa' },
    unsubscribe: { bg: '#3a1a2a', text: '#ef4444' },
  };
  const c = colors[type] || { bg: '#1e2a3a', text: '#6b7280' };
  return (
    <span style={{ display: 'inline-flex', padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: c.bg, color: c.text, textTransform: 'capitalize' }}>
      {type.replace(/_/g, ' ')}
    </span>
  );
}
