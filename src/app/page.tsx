export const dynamic = 'force-dynamic';
'use client';
import { useEffect, useState } from 'react';
import { Account, Prospect } from '@/types';

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);

  useEffect(() => {
    fetch('/api/accounts').then(r => r.json()).then(setAccounts);
    fetch('/api/prospects').then(r => r.json()).then(setProspects);
  }, []);

  const statusCounts = prospects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Dashboard</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: 13 }}>Outreach Engine — Phase 1 (Mock Data)</p>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="Accounts" value={accounts.length} color="var(--blue)" />
        <StatCard label="Prospects" value={prospects.length} color="var(--accent)" />
        <StatCard label="Drafted" value={statusCounts['drafted'] || 0} color="var(--yellow)" />
        <StatCard label="Contacted" value={statusCounts['contacted'] || 0} color="var(--purple)" />
      </div>

      {/* Accounts table */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Target Accounts</h2>
          <a href="/accounts" className="btn btn-secondary btn-sm">View All →</a>
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
                <td style={{ color: 'var(--text-secondary)' }}>{a.industry}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{a.hq_location}</td>
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
          <a href="/prospects" className="btn btn-secondary btn-sm">View All →</a>
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
                <td style={{ color: 'var(--text-secondary)' }}>{p.title}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{p.account_name}</td>
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
