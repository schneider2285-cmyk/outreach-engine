'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Account, Prospect } from '@/types';

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/accounts').then(r => {
        if (!r.ok) throw new Error('Failed to load accounts');
        return r.json();
      }),
      fetch('/api/prospects').then(r => {
        if (!r.ok) throw new Error('Failed to load prospects');
        return r.json();
      }),
    ])
      .then(([accs, pros]) => { setAccounts(accs); setProspects(pros); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const statusCounts = prospects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Dashboard</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: 13 }}>Outreach Engine overview</p>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="Accounts" value={accounts.length} color="var(--blue)" />
        <StatCard label="Prospects" value={prospects.length} color="var(--accent)" />
        <StatCard label="Drafted" value={statusCounts['drafted'] || 0} color="var(--yellow)" />
        <StatCard label="Contacted" value={statusCounts['contacted'] || 0} color="var(--purple)" />
      </div>

      {/* Pipeline summary */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Pipeline</h2>
        <div style={{ display: 'flex', gap: 4, height: 32, borderRadius: 8, overflow: 'hidden' }}>
          {(['new', 'researched', 'drafted', 'contacted', 'engaged'] as const).map(status => {
            const count = statusCounts[status] || 0;
            const pct = prospects.length > 0 ? (count / prospects.length) * 100 : 0;
            if (pct === 0) return null;
            const colors: Record<string, string> = { new: 'var(--blue)', researched: 'var(--accent)', drafted: 'var(--yellow)', contacted: 'var(--purple)', engaged: '#4ade80' };
            return (
              <div key={status} style={{
                width: `${pct}%`, minWidth: pct > 0 ? 40 : 0,
                background: colors[status], display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#000',
              }} title={`${status}: ${count}`}>
                {count}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
          {(['new', 'researched', 'drafted', 'contacted', 'engaged'] as const).map(status => {
            const count = statusCounts[status] || 0;
            const colors: Record<string, string> = { new: 'var(--blue)', researched: 'var(--accent)', drafted: 'var(--yellow)', contacted: 'var(--purple)', engaged: '#4ade80' };
            return (
              <span key={status} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[status] }} />
                {status} ({count})
              </span>
            );
          })}
        </div>
      </div>

      {/* Accounts table */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Target Accounts</h2>
          <Link href="/accounts" className="btn btn-secondary btn-sm">View All</Link>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Industry</th>
              <th>HQ</th>
              <th>Prospects</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(a => (
              <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/accounts/${a.id}`}>
                <td style={{ fontWeight: 600 }}>{a.name}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{a.industry || '—'}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{a.hq_location || '—'}</td>
                <td><span className="badge badge-new">{a.prospect_count || 0}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent prospects */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Recent Prospects</h2>
          <Link href="/prospects" className="btn btn-secondary btn-sm">View All</Link>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Title</th>
              <th>Account</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {prospects.slice(0, 5).map(p => (
              <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/prospects/${p.id}`}>
                <td style={{ fontWeight: 600 }}>{p.full_name}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{p.title || '—'}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{p.account_name || '—'}</td>
                <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 32, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
        <div style={{ fontSize: 13 }}>Loading dashboard...</div>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
        <div style={{ fontSize: 14, color: 'var(--red)', marginBottom: 12 }}>{message}</div>
        <button className="btn btn-secondary" onClick={onRetry}>Retry</button>
      </div>
    </div>
  );
}
