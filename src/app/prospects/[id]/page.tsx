'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function ProspectDetail() {
  const params = useParams();
  const [prospect, setProspect] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [researchResult, setResearchResult] = useState<any>(null);

  const load = () => {
    fetch(`/api/prospects/${params.id}`)
      .then(r => r.json())
      .then(d => { setProspect(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [params.id]);

  const runResearch = async (tier: string) => {
    setResearching(true);
    setResearchResult(null);
    try {
      const res = await fetch(`/api/prospects/${params.id}/research/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      setResearchResult(data);
      load(); // Refresh prospect data
    } catch (err: any) {
      setResearchResult({ error: err.message });
    }
    setResearching(false);
  };

  const logOutcome = async (outcomeType: string, notes: string) => {
    await fetch(`/api/prospects/${params.id}/outcomes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome_type: outcomeType, notes }),
    });
    load();
  };

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Loading...</div>;
  if (!prospect) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Prospect not found</div>;

  const p = prospect;
  const statusColor: Record<string, string> = {
    new: '#8888ff', researched: '#ffcc00', drafted: '#ff8844', contacted: '#44ccff', engaged: '#44ff88'
  };

  return (
    <div>
      <a href={p.account_id ? `/accounts/${p.account_id}` : '/prospects'} style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', marginBottom: 8, display: 'inline-block' }}>← Back</a>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>{p.full_name}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{p.title || 'No title'} · {p.account_name || ''}</p>
        </div>
        <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: `${statusColor[p.status] || '#888'}22`, color: statusColor[p.status] || '#888' }}>{p.status?.toUpperCase()}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Profile</h3>
          {[
            ['Location', p.location], ['Seniority', p.seniority], ['Department', p.department],
            ['Email', p.email], ['LinkedIn', p.linkedin_url], ['BU Hypothesis', p.bu_hypothesis],
            ['Persona', p.persona_segment],
          ].map(([label, val]) => val ? (
            <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.04)', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span>{label === 'LinkedIn' ? <a href={val as string} target="_blank" rel="noopener" style={{ color: 'var(--accent-blue)' }}>View →</a> : val}</span>
            </div>
          ) : null)}
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🔬 Research</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Run Perplexity-powered research on this prospect.</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['quick', 'standard', 'deep'].map(tier => (
              <button key={tier} onClick={() => runResearch(tier)} disabled={researching}
                style={{ flex: 1, padding: '10px 8px', borderRadius: 8, border: '1px solid var(--border)', background: researching ? 'var(--bg-tertiary)' : 'var(--bg-hover)', color: 'var(--text-primary)', cursor: researching ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
                {researching ? '...' : tier}
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                  {tier === 'quick' ? '2 searches' : tier === 'standard' ? '5 searches' : '10 searches'}
                </div>
              </button>
            ))}
          </div>
          {researchResult && (
            <div style={{ padding: 12, borderRadius: 8, background: researchResult.error ? 'rgba(255,50,50,.1)' : 'rgba(61,204,74,.1)', fontSize: 12 }}>
              {researchResult.error ? `❌ ${researchResult.error}` : `✅ ${researchResult.searches} searches · ${researchResult.evidence_count} evidence items · ${researchResult.cost_estimate}`}
            </div>
          )}
          {p.research_runs?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>History</div>
              {p.research_runs.map((r: any) => (
                <div key={r.id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.04)', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{r.tier} · {r.search_count} searches</span>
                  <span style={{ color: r.status === 'completed' ? 'var(--accent-green)' : 'var(--accent-yellow)' }}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Evidence */}
      {p.evidence?.length > 0 && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📄 Evidence ({p.evidence.length})</h3>
          {p.evidence.filter((e: any) => !e.source_url.startsWith('perplexity://')).slice(0, 10).map((e: any) => (
            <div key={e.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.04)', fontSize: 12 }}>
              <a href={e.source_url} target="_blank" rel="noopener" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>{e.source_title || e.source_url}</a>
              <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{e.snippet?.substring(0, 200)}...</div>
            </div>
          ))}
        </div>
      )}

      {/* Insights */}
      {p.insights?.length > 0 && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>💡 Insights</h3>
          {p.insights.map((i: any) => (
            <div key={i.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.04)', fontSize: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 4, textTransform: 'capitalize' }}>{i.insight_type?.replace(/_/g, ' ')}</div>
              <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{typeof i.content === 'object' ? (i.content.summary || JSON.stringify(i.content)) : i.content}</div>
            </div>
          ))}
        </div>
      )}

      {/* Outcome Logger */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📊 Log Outcome</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['positive', 'neutral', 'objection', 'no_reply', 'referral', 'not_relevant'].map(type => (
            <button key={type} onClick={() => logOutcome(type, '')}
              style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-hover)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 12, textTransform: 'capitalize' }}>
              {type.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        {p.outcomes?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {p.outcomes.map((o: any) => (
              <div key={o.id} style={{ padding: '6px 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                {o.outcome_type} — {new Date(o.created_at).toLocaleDateString()}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
