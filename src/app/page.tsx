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

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Loading...</div>;

  const s = stats || { accounts: 0, prospects: 0, drafted: 0, contacted: 0, recent_prospects: [], account_list: [] };

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Dashboard</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>Outreach Engine — Live Data</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'ACCOUNTS', value: s.accounts, color: 'var(--accent-blue)' },
          { label: 'PROSPECTS', value: s.prospects, color: 'var(--accent-green)' },
          { label: 'DRAFTED', value: s.drafted, color: 'var(--accent-yellow)' },
          { label: 'CONTACTED', value: s.contacted, color: 'var(--accent-purple)' },
        ].map(card => (
          <div key={card.label} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, color: 'var(--text-muted)', marginTop: 4 }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Target Accounts</h2>
            <a href="/accounts" style={{ fontSize: 12, color: 'var(--accent-green)', textDecoration: 'none', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 6 }}>View All →</a>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            <div>Account</div><div>Industry</div><div>HQ</div><div>Prospects</div>
          </div>
          {s.account_list.map((a: any) => (
            <a key={a.id} href={`/accounts/${a.id}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: 8, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13, textDecoration: 'none', color: 'var(--text-primary)' }}>
              <div style={{ fontWeight: 600 }}>{a.name}</div>
              <div style={{ color: 'var(--text-secondary)' }}>{a.industry || '—'}</div>
              <div style={{ color: 'var(--text-secondary)' }}>{a.hq_location || '—'}</div>
              <div><span style={{ background: 'rgba(61,204,74,.15)', color: 'var(--accent-green)', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{a.prospect_count}</span></div>
            </a>
          ))}
          {!s.account_list.length && <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>No accounts yet. <a href="/accounts" style={{ color: 'var(--accent-green)' }}>Add one →</a></div>}
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Recent Prospects</h2>
            <a href="/prospects" style={{ fontSize: 12, color: 'var(--accent-green)', textDecoration: 'none', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 6 }}>View All →</a>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            <div>Name</div><div>Title</div><div>Account</div><div>Status</div>
          </div>
          {s.recent_prospects.map((p: any) => (
            <a key={p.id} href={`/prospects/${p.id}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: 8, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13, textDecoration: 'none', color: 'var(--text-primary)' }}>
              <div style={{ fontWeight: 600 }}>{p.full_name}</div>
              <div style={{ color: 'var(--text-secondary)' }}>{p.title || '—'}</div>
              <div style={{ color: 'var(--text-secondary)' }}>{p.account_name || '—'}</div>
              <div><span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: p.status === 'new' ? 'rgba(100,100,255,.15)' : p.status === 'researched' ? 'rgba(255,200,0,.15)' : 'rgba(61,204,74,.15)', color: p.status === 'new' ? '#8888ff' : p.status === 'researched' ? '#ffcc00' : 'var(--accent-green)' }}>{p.status}</span></div>
            </a>
          ))}
          {!s.recent_prospects.length && <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>No prospects yet.</div>}
        </div>
      </div>
    </div>
  );
}
