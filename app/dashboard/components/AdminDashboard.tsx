'use client';

import Link from 'next/link';

export default function AdminDashboard() {
  const actions = [
    {
      title: 'Store Locations',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 01-6 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      ),
      description: 'Register and manage active store franchises.',
      href: '/dashboard/admin/locations'
    },
    {
      title: 'Vendors & Suppliers',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5-1.5l-3-1m-3.182-5.59L12.75 3M2.25 9.75v10.5c0 .414.336.75.75.75h3.75m-.75-11.25V21" />
        </svg>
      ),
      description: 'Onboard wholesale vendor contacts and channels.',
      href: '/dashboard/admin/vendors'
    },
    {
      title: 'Product Catalog',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      ),
      description: 'Catalog products, base units, and multipliers.',
      href: '/dashboard/admin/items'
    },
    {
      title: 'Staff Accounts',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766v-.109A12.318 12.318 0 019.374 19c2.24 0 4.303.596 6.077 1.637m0-.709A12.31 12.31 0 019.374 19c-2.24 0-4.303.596-6.077 1.637m0-.709c0-1.114.285-2.16.786-3.07M15 12.25A3.25 3.25 0 1111.75 9 3.25 3.25 0 0115 12.25zM6.75 12.25A3.25 3.25 0 113.5 9a3.25 3.25 0 013.25 3.25z" />
        </svg>
      ),
      description: 'Register employee accounts and manage roles.',
      href: '/dashboard/admin/users'
    },
    {
      title: 'Ordering Schedules',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
      description: 'Configure automated Slack pings for stock takes.',
      href: '/dashboard/admin/schedules'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Admin Portal</h1>
          <p>Configure global parameters, manage core entities, and audit overall kitchen operations.</p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '24px'
      }} className="stagger">
        {actions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="card card-hover"
            style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '16px',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              textDecoration: 'none'
            }}
          >
            {/* Soft accent glow on hover */}
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '96px',
              height: '96px',
              background: 'var(--accent-subtle)',
              borderRadius: '50%',
              filter: 'blur(30px)',
              marginRight: '-30px',
              marginTop: '-30px',
              pointerEvents: 'none'
            }} />

            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-sunken)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)'
            }}>
              {action.icon}
            </div>

            <div>
              <h3 style={{
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {action.title}
              </h3>
              <p style={{
                fontSize: '0.8125rem',
                color: 'var(--text-tertiary)',
                lineHeight: 1.5
              }}>
                {action.description}
              </p>
            </div>

            <div style={{
              marginTop: 'auto',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              Manage settings
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 10, height: 10 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

