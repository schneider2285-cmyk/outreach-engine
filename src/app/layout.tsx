'use client';

import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>Outreach Engine</title>
        <meta name="description" content="Multi-tenant outreach intelligence platform" />
      </head>
      <body>
        <div style={{ display: 'flex', height: '100vh' }}>
          <nav style={{
            width: 220, minWidth: 220, background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border)', display: 'flex',
            flexDirection: 'column', padding: '20px 0',
          }}>
            <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>⚡ Outreach</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Engine v0.1</div>
            </div>
            <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <NavLink href="/" label="Dashboard" icon="📊" />
              <NavLink href="/accounts" label="Accounts" icon="🏢" />
              <NavLink href="/prospects" label="All Prospects" icon="👤" />
                          <NavLink href="/quick-draft" label="Quick Draft" icon="⚡" />
            </div>
            <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
                          Phase 3.5 — Empathy Gate + Quick Draft
            </div>
          </nav>
          <main style={{ flex: 1, overflow: 'auto', padding: 32 }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <a href={href} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
      borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)',
      textDecoration: 'none', transition: 'all 0.15s',
    }}
    onMouseEnter={(e) => {
      (e.target as HTMLElement).style.background = 'var(--bg-hover)';
      (e.target as HTMLElement).style.color = 'var(--text-primary)';
    }}
    onMouseLeave={(e) => {
      (e.target as HTMLElement).style.background = 'transparent';
      (e.target as HTMLElement).style.color = 'var(--text-secondary)';
    }}>
      <span>{icon}</span> {label}
    </a>
  );
}
