'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/accounts', label: 'Accounts', icon: '🏢' },
  { href: '/prospects', label: 'All Prospects', icon: '👤' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
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
        {navItems.map(item => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);

          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 8, fontSize: 13, fontWeight: 500,
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              background: isActive ? 'rgba(61,220,132,0.08)' : 'transparent',
              textDecoration: 'none', transition: 'all 0.15s',
            }}>
              <span>{item.icon}</span> {item.label}
            </Link>
          );
        })}
      </div>
      <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
        Phase 1 — Mock Data
      </div>
    </nav>
  );
}
