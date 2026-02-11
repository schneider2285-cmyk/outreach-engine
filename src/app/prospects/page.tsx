export const dynamic = 'force-dynamic';
'use client';
import { useEffect, useState } from 'react';
import { Prospect } from '@/types';

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('/api/prospects').then(r => r.json()).then(setProspects);
  }, []);

  const filtered = filter === 'all' ? prospects : prospects.filter(p => p.status === filter);
  const statuses = ['all', 'new', 'researched', 'drafted', 'contacted', 'engaged'];

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>All Prospects</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>Across all target accounts</p>

      {/* Filter tabs */}
      <div className="tab-bar">
        {statuses.map(s => (
          <div key={s} className={`tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)} style={{ textTransform: 'capitalize' }}>
            {s} {s === 'all' ? `(${prospects.length})` : `(${prospects.filter(p => p.status === s).length})`}
          </div>
        ))}
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Title</th>
              <th>Account</th>
              <th>Seniority</th>
              <th>Department</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/prospects/${p.id}`}>
                <td style={{ fontWeight: 600 }}>{p.full_name}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{p.title || '—'}</td>
                <td><a href={`/accounts/${p.account_id}`} onClick={e => e.stopPropagation()} style={{ fontSize: 12 }}>{p.account_name || '—'}</a></td>
                <td style={{ color: 'var(--text-secondary)' }}>{p.seniority || '—'}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{p.department || '—'}</td>
                <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No prospects match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
