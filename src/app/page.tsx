'use client';

import { useEffect, useState } from 'react';

interface Stats {
    accounts: number;
    prospects: number;
    drafted: number;
    contacted: number;
    recent_prospects: any[];
    account_list: any[];
}

interface SyncResult {
    success?: boolean;
    error?: string;
    summary?: {
      total_in_sheet: number;
      inserted: number;
      updated: number;
      skipped: number;
    };
}

export default function Dashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
    const [syncConfig, setSyncConfig] = useState<{ configured: boolean; current_prospects: number } | null>(null);

  const loadStats = () => {
        fetch('/api/stats')
          .then(r => r.json())
          .then(d => { setStats(d); setLoading(false); })
          .catch(() => setLoading(false));
  };

  useEffect(() => {
        loadStats();
        fetch('/api/sync-sheet').then(r => r.json()).then(setSyncConfig).catch(() => {});
  }, []);

  const handleSync = async () => {
        setSyncing(true);
        setSyncResult(null);
        try {
                const res = await fetch('/api/sync-sheet', { method: 'POST' });
                const data = await res.json();
                setSyncResult(data);
                if (data.success) {
                          loadStats();
                }
        } catch (err: any) {
                setSyncResult({ error: err.message || 'Sync failed' });
        }
        setSyncing(false);
  };

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Loading...</div>div>;

  const s = stats || { accounts: 0, prospects: 0, drafted: 0, contacted: 0, recent_prospects: [], account_list: [] };

  return (
        <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div>
                                <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Dashboard</h1>h1>
                                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>Outreach Engine — Live Data</p>p>
                      </div>div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <button
                                              onClick={handleSync}
                                              disabled={syncing}
                                              style={{
                                                              background: syncing ? 'var(--bg-hover)' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                                              color: '#fff',
                                                              border: 'none',
                                                              borderRadius: 8,
                                                              padding: '10px 18px',
                                                              fontSize: 13,
                                                              fontWeight: 600,
                                                              cursor: syncing ? 'wait' : 'pointer',
                                                              display: 'flex',
                                                              alignItems: 'center',
                                                              gap: 8,
                                                              opacity: syncing ? 0.7 : 1,
                                                              transition: 'all 0.15s',
                                              }}
                                            >
                                            <span style={{ fontSize: 16 }}>{syncing ? '⏳' : '🔄'}</span>span>
                                  {syncing ? 'Syncing...' : 'Sync from Sheet'}
                                </button>button>
                      </div>div>
              </div>div>
        
          {/* Sync result banner */}
          {syncResult && (
                  <div style={{
                              padding: '12px 16px',
                              borderRadius: 8,
                              marginBottom: 20,
                              fontSize: 13,
                              background: syncResult.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                              border: `1px solid ${syncResult.success ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                              color: syncResult.success ? '#22c55e' : '#ef4444',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                  }}>
                            <div>
                              {syncResult.success ? (
                                  <span>
                                                  ✅ Sheet sync complete — {syncResult.summary?.total_in_sheet} contacts found,{' '}
                                    {syncResult.summary?.inserted} new, {syncResult.summary?.updated} updated
                                  </span>span>
                                ) : (
                                  <span>❌ {syncResult.error}</span>span>
                                        )}
                            </div>div>
                            <button
                                          onClick={() => setSyncResult(null)}
                                          style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
                                        >×</button>button>
                  </div>div>
              )}
        
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
                {[
          { label: 'ACCOUNTS', value: s.accounts, color: 'var(--accent-blue)' },
          { label: 'PROSPECTS', value: s.prospects, color: 'var(--accent-green)' },
          { label: 'DRAFTED', value: s.drafted, color: 'var(--accent-yellow)' },
          { label: 'CONTACTED', value: s.contacted, color: 'var(--accent-purple)' },
                  ].map(card => (
                              <div key={card.label} style={{
                                            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                                            borderRadius: 10, padding: '20px 24px', textAlign: 'center'
                              }}>
                                          <div style={{ fontSize: 32, fontWeight: 800, color: card.color }}>{card.value}</div>div>
                                          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, color: 'var(--text-muted)', marginTop: 4 }}>{card.label}</div>div>
                              </div>div>
                            ))}
              </div>div>
        
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Target Accounts</h2>h2>
                                            <a href="/accounts" style={{ fontSize: 12, color: 'var(--accent-green)', textDecoration: 'none', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 6 }}>View All →</a>a>
                                </div>div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                            <div>Account</div>div><div>Industry</div>div><div>HQ</div>div><div>Prospects</div>div>
                                </div>div>
                        {s.account_list.map((a: any) => (
                      <a key={a.id} href={`/accounts/${a.id}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: 8, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13, textDecoration: 'none', color: 'var(--text-primary)' }}>
                                    <div style={{ fontWeight: 600 }}>{a.name}</div>div>
                                    <div style={{ color: 'var(--text-secondary)' }}>{a.industry || '—'}</div>div>
                                    <div style={{ color: 'var(--text-secondary)' }}>{a.hq_location || '—'}</div>div>
                                    <div><span style={{ background: 'rgba(61,204,74,.15)', color: 'var(--accent-green)', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{a.prospect_count}</span>span></div>div>
                      </a>a>
                    ))}
                        {!s.account_list.length && <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>No accounts yet. <a href="/accounts" style={{ color: 'var(--accent-green)' }}>Add one →</a>a></div>div>}
                      </div>div>
              
                      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Recent Prospects</h2>h2>
                                            <a href="/prospects" style={{ fontSize: 12, color: 'var(--accent-green)', textDecoration: 'none', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 6 }}>View All →</a>a>
                                </div>div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                            <div>Name</div>div><div>Title</div>div><div>Account</div>div><div>Status</div>div>
                                </div>div>
                        {s.recent_prospects.map((p: any) => (
                      <a key={p.id} href={`/prospects/${p.id}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: 8, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13, textDecoration: 'none', color: 'var(--text-primary)' }}>
                                    <div style={{ fontWeight: 600 }}>{p.full_name}</div>div>
                                    <div style={{ color: 'var(--text-secondary)' }}>{p.title || '—'}</div>div>
                                    <div style={{ color: 'var(--text-secondary)' }}>{p.account_name || '—'}</div>div>
                                    <div><span style={{
                                        padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                                        background: p.status === 'new' ? 'rgba(100,100,255,.15)' : p.status === 'researched' ? 'rgba(255,200,0,.15)' : 'rgba(61,204,74,.15)',
                                        color: p.status === 'new' ? '#8888ff' : p.status === 'researched' ? '#ffcc00' : 'var(--accent-green)'
                      }}>{p.status}</span>span></div>div>
                      </a>a>
                    ))}
                        {!s.recent_prospects.length && <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>No prospects yet.</div>div>}
                      </div>div>
              </div>div>
        </div>div>
      );
}</div>
