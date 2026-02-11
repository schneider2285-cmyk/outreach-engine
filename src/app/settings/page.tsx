'use client';
import { useEffect, useState } from 'react';
import { Account, Prospect } from '@/types';

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/accounts').then(r => r.json()),
      fetch('/api/prospects').then(r => r.json()),
    ])
      .then(([accs, pros]) => { setAccounts(accs); setProspects(pros); })
      .finally(() => setLoading(false));
  }, []);

  const statusCounts = prospects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const seniorityBreakdown = prospects.reduce((acc, p) => {
    const key = p.seniority || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const departmentBreakdown = prospects.reduce((acc, p) => {
    const key = p.department || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>⏳ Loading...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Settings</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>Configuration and data overview</p>

      {/* Tenant info */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Tenant Configuration</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <SettingRow label="Tenant ID" value="f47ac10b-58cc-4372-a567-0e02b2c3d479" />
          <SettingRow label="Data Mode" value="Mock Data (Phase 1)" />
          <SettingRow label="Database" value="Supabase (not connected)" />
          <SettingRow label="Research API" value="Perplexity (not connected)" />
          <SettingRow label="Draft Generation" value="Claude API (not connected)" />
          <SettingRow label="Judge Scoring" value="Claude API (not connected)" />
        </div>
      </div>

      {/* Data summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Data Summary</h2>
          <SettingRow label="Accounts" value={String(accounts.length)} />
          <SettingRow label="Prospects" value={String(prospects.length)} />
          <SettingRow label="Pipeline Stages" value="new → researched → drafted → contacted → engaged" />
        </div>

        <div className="card">
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Pipeline Breakdown</h2>
          {['new', 'researched', 'drafted', 'contacted', 'engaged'].map(status => {
            const count = statusCounts[status] || 0;
            const pct = prospects.length > 0 ? ((count / prospects.length) * 100).toFixed(0) : '0';
            return (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 80, textTransform: 'capitalize' }}>{status}</span>
                <div style={{ flex: 1, height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 30, textAlign: 'right' }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Seniority & Department breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>By Seniority</h2>
          {Object.entries(seniorityBreakdown).sort((a, b) => b[1] - a[1]).map(([key, count]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{key}</span>
              <span style={{ fontWeight: 600 }}>{count}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>By Department</h2>
          {Object.entries(departmentBreakdown).sort((a, b) => b[1] - a[1]).map(([key, count]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{key}</span>
              <span style={{ fontWeight: 600 }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Roadmap */}
      <div className="card">
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Roadmap</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <RoadmapItem phase="Phase 1" title="Skeleton + Mock Data" status="current" items={['UI scaffold', 'Type system', 'Mock API routes', 'Supabase schema']} />
          <RoadmapItem phase="Phase 2" title="Supabase Integration" status="next" items={['Connect database', 'CRUD persistence', 'RLS policies', 'Auth setup']} />
          <RoadmapItem phase="Phase 3" title="AI Integration" status="future" items={['Perplexity research', 'Claude draft generation', 'Claims audit', 'Judge scoring']} />
          <RoadmapItem phase="Phase 4" title="Learning Loop" status="future" items={['Variant stats tracking', 'A/B optimization', 'Persona-based strategies', 'Outcome analytics']} />
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--text-secondary)' }}>{value}</span>
    </div>
  );
}

function RoadmapItem({ phase, title, status, items }: { phase: string; title: string; status: 'current' | 'next' | 'future'; items: string[] }) {
  const colors = { current: 'var(--accent)', next: 'var(--yellow)', future: 'var(--text-muted)' };
  const badges = { current: 'badge-engaged', next: 'badge-drafted', future: 'badge-new' };
  const labels = { current: 'In Progress', next: 'Up Next', future: 'Planned' };
  return (
    <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, borderLeft: `3px solid ${colors[status]}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: colors[status], marginRight: 8 }}>{phase}</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
        </div>
        <span className={`badge ${badges[status]}`}>{labels[status]}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {items.map(item => (
          <span key={item} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>{item}</span>
        ))}
      </div>
    </div>
  );
}
