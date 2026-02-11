export const dynamic = 'force-dynamic';
'use client';
import { useEffect, useState } from 'react';
import { Account } from '@/types';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', domain: '', industry: '', hq_location: '', employee_count: '', notes: '' });

  useEffect(() => {
    fetch('/api/accounts').then(r => r.json()).then(setAccounts);
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const newAccount = await res.json();
    setAccounts(prev => [...prev, newAccount]);
    setShowCreate(false);
    setForm({ name: '', domain: '', industry: '', hq_location: '', employee_count: '', notes: '' });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Accounts</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Target companies for outreach</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add Account</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {accounts.map(a => (
          <a key={a.id} href={`/accounts/${a.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card" style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{a.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{a.domain}</div>
                </div>
                <span className="badge badge-new">{a.prospect_count || 0} prospects</span>
              </div>
              <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--text-secondary)' }}>
                <span>🏭 {a.industry || '—'}</span>
                <span>📍 {a.hq_location || '—'}</span>
              </div>
              {a.notes && (
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  {a.notes}
                </div>
              )}
            </div>
          </a>
        ))}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>New Account</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label>Company Name *</label><input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Schneider Electric" /></div>
              <div><label>Domain</label><input type="text" value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} placeholder="e.g. se.com" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div><label>Industry</label><input type="text" value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} /></div>
                <div><label>HQ Location</label><input type="text" value={form.hq_location} onChange={e => setForm(f => ({ ...f, hq_location: e.target.value }))} /></div>
              </div>
              <div><label>Employee Count</label><input type="text" value={form.employee_count} onChange={e => setForm(f => ({ ...f, employee_count: e.target.value }))} /></div>
              <div><label>Notes</label><textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate}>Create Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
