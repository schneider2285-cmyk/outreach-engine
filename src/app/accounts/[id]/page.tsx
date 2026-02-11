'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Account, Prospect } from '@/types';

export default function AccountDetailPage() {
  const params = useParams();
  const accountId = params.id as string;
  const [account, setAccount] = useState<Account | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<'manual' | 'linkedin'>('manual');
  const [form, setForm] = useState({
    full_name: '', title: '', linkedin_url: '', email: '', location: '',
    seniority: '', department: '', raw_linkedin_text: '',
  });

  useEffect(() => {
    fetch('/api/accounts').then(r => r.json()).then((accs: Account[]) => {
      setAccount(accs.find(a => a.id === accountId) || null);
    });
    fetch(`/api/prospects?account_id=${accountId}`).then(r => r.json()).then(setProspects);
  }, [accountId]);

  const handleAddProspect = async () => {
    if (!form.full_name.trim() && !form.raw_linkedin_text.trim()) return;
    const res = await fetch('/api/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, account_id: accountId }),
    });
    const newP = await res.json();
    newP.account_name = account?.name;
    setProspects(prev => [...prev, newP]);
    setShowAdd(false);
    setForm({ full_name: '', title: '', linkedin_url: '', email: '', location: '', seniority: '', department: '', raw_linkedin_text: '' });
  };

  if (!account) return <div style={{ color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <a href="/accounts" style={{ fontSize: 12, color: 'var(--text-muted)' }}>← Back to Accounts</a>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>{account.name}</h1>
          <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
            <span>🏭 {account.industry || '—'}</span>
            <span>📍 {account.hq_location || '—'}</span>
            <span>👥 {account.employee_count || '—'}</span>
            <span>🌐 {account.domain || '—'}</span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Prospect</button>
      </div>

      {account.notes && (
        <div className="card" style={{ marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Account Notes</div>
          {account.notes}
        </div>
      )}

      {/* Prospects table */}
      <div className="card">
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Prospects ({prospects.length})</h2>
        {prospects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>👤</div>
            <div style={{ fontSize: 13 }}>No prospects yet. Add one to get started.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Title</th>
                <th>Department</th>
                <th>Seniority</th>
                <th>Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {prospects.map(p => (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/prospects/${p.id}`}>
                  <td style={{ fontWeight: 600 }}>{p.full_name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{p.title || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{p.department || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{p.seniority || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{p.location || '—'}</td>
                  <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add prospect modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Add Prospect</h2>

            {/* Mode toggle */}
            <div className="tab-bar" style={{ marginBottom: 20 }}>
              <div className={`tab ${addMode === 'manual' ? 'active' : ''}`} onClick={() => setAddMode('manual')}>Manual Entry</div>
              <div className={`tab ${addMode === 'linkedin' ? 'active' : ''}`} onClick={() => setAddMode('linkedin')}>Paste LinkedIn</div>
            </div>

            {addMode === 'linkedin' ? (
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
                  Copy the text from a LinkedIn profile page and paste it below. The engine will extract name, title, company, and other details in Phase 3.
                </p>
                <div><label>LinkedIn Profile Text</label><textarea rows={10} value={form.raw_linkedin_text} onChange={e => setForm(f => ({ ...f, raw_linkedin_text: e.target.value }))} placeholder="Paste LinkedIn profile text here..." /></div>
                <div style={{ marginTop: 14 }}><label>Full Name *</label><input type="text" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="e.g. Jean-Pascal Tricoire" /></div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div><label>Full Name *</label><input type="text" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="e.g. Jean-Pascal Tricoire" /></div>
                <div><label>Title</label><input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. SVP, Digital Technology" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div><label>LinkedIn URL</label><input type="url" value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))} /></div>
                  <div><label>Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label>Seniority</label>
                    <select value={form.seniority} onChange={e => setForm(f => ({ ...f, seniority: e.target.value }))}>
                      <option value="">Select...</option>
                      <option value="C-Suite">C-Suite</option>
                      <option value="VP">VP</option>
                      <option value="Director">Director</option>
                      <option value="Manager">Manager</option>
                      <option value="IC">IC</option>
                    </select>
                  </div>
                  <div><label>Department</label><input type="text" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} /></div>
                </div>
                <div><label>Location</label><input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddProspect}>Add Prospect</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
