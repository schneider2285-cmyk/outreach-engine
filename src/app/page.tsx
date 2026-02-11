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
  message?: string;
  synced?: number;
  skipped?: number;
  total?: number;
  error?: string;
  errors?: string[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const loadStats = () => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadStats(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/sync-sheet', { method: 'POST' });
      const data = await res.json();
      setSyncResult(data);
      if (!data.error) {
        loadStats();
      }
    } catch (err: any) {
      setSyncResult({ error: err.message || 'Sync failed' });
    }
    setSyncing(false);
  };

  if (loading) return (
    <div style={{ padding: 32, color: 'var(--text-muted)' }}>Loading...</div>
  );

  const s = stats || { accounts: 0, prospects: 0, drafted: 0, contacted: 0, recent_prospects: [], account_list: [] };

  const isSuccess = syncResult && !syncResult.error;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>Outreach Engine — Live Data</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              background: syncing ? 'var(--bg-hover)' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px',
              fontSize: 13, fontWeight: 600, cursor: syncing ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              opacity: syncing ? 0.7 : 1, transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 16 }}>{syncing ? '\u23F3' : '\uD83D\uDD04'}</span>
            {syncing ? 'Syncing...' : 'Sync from Sheet'}
          </button>
        </div>
      </div>

      {syncResult && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13,
          background: isSuccess ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${isSuccess ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: isSuccess ? '#22c55e' : '#ef4444',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            {isSuccess ? (
              <span>{syncResult.message} (total: {syncResult.total})</span>
            ) : (
              <span>{syncResult.error || 'Unknown error'}</span>
            )}
          </div>
          <button
            onClick={() => setSyncResult(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
          >&times;</button>
        </div>
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
            <div style={{ fontSize: 32, fontWeight: 800, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, color: 'var(--text-muted)', marginTop: 4 }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Target Accounts</h2>
            <a href="/accounts" style={{ fontSize: 12, color: 'var(--accent-green)', textDecoration: 'none', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 6 }}>View All &rarr;</a>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            <div>Account</div><div>Industry</div><div>HQ</div><div>Prospects</div>
          </div>
          {s.account_list.map((a: any) => (
            <a key={a.id} href={`/accounts/${a.id}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: 8, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13, textDecoration: 'none', color: 'var(--text-primary)' }}>
              <div style={{ fontWeight: 600 }}>{a.name}</div>
              <div style={{ color: 'var(--text-secondary)' }}>{a.industry || '\u2014'}</div>
              <div style={{ color: 'var(--text-secondary)' }}>{a.hq_location || '\u2014'}</div>
              <div><span style={{ background: 'rgba(61,204,74,.15)', color: 'var(--accent-green)', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{a.prospect_count}</span></div>
            </a>
          ))}
          {!s.account_list.length && <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>No accounts yet.</div>}
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Recent Prospects</h2>
            <a href="/prospects" style={{ fontSize: 12, color: 'var(--accent-green)', textDecoration: 'none', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 6 }}>View All &rarr;</a>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            <div>Name</div><div>Title</div><div>Account</div><div>Status</div>
          </div>
          {s.recent_prospects.map((p: any) => (
            <a key={p.id} href={`/prospects/${p.id}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: 8, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13, textDecoration: 'none', color: 'var(--text-primary)' }}>
              <div style={{ fontWeight: 600 }}>{p.full_name}</div>
              <div style={{ color: 'var(--text-secondary)' }}>{p.title || '\u2014'}</div>
              <div style={{ color: 'var(--text-secondary)' }}>{p.account_name || '\u2014'}</div>
              <div><span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                background: p.status === 'new' ? 'rgba(100,100,255,.15)' : p.status === 'researched' ? 'rgba(255,200,0,.15)' : 'rgba(61,204,74,.15)',
                color: p.status === 'new' ? '#8888ff' : p.status === 'researched' ? '#ffcc00' : 'var(--accent-green)'
              }}>{p.status}</span></div>
            </a>
          ))}
          {!s.recent_prospects.length && <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>No prospects yet.</div>}
        </div>
      </div>
    </div>
  );
}
