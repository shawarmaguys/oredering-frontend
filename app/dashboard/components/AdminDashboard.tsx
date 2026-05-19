'use client';

import Link from 'next/link';

export default function AdminDashboard() {
  const actions = [
    {
      title: 'Store Locations',
      icon: '📍',
      description: 'Register and manage active store franchises.',
      href: '/dashboard/admin/locations'
    },
    {
      title: 'Vendors & Suppliers',
      icon: '🏢',
      description: 'Onboard wholesale vendor contact and channels.',
      href: '/dashboard/admin/vendors'
    },
    {
      title: 'Product Catalog',
      icon: '📦',
      description: 'Catalog products, base units, and multipliers.',
      href: '/dashboard/admin/items'
    },
    {
      title: 'Staff Accounts',
      icon: '👤',
      description: 'Register employee accounts and manage roles.',
      href: '/dashboard/admin/users'
    },
    {
      title: 'Ordering Schedules',
      icon: '📅',
      description: 'Configure automated Slack pings for stock takes.',
      href: '/dashboard/admin/schedules'
    },
    // { 
    //   title: 'Localization Dictionary', 
    //   icon: '🗣️', 
    //   description: 'Translate inventory sheet items for multilingual staff.',
    //   href: '/dashboard/admin/translations'
    // },
    // { 
    //   title: 'Reports & POs', 
    //   icon: '📊', 
    //   description: 'Verify kitchen audits and authorize purchase orders.',
    //   href: '/dashboard/admin/reports'
    // },
  ];

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Admin Portal</h1>
        <p className="text-gray-500 dark:text-zinc-400 mt-2">Manage global entities, configure system parameters, and approve purchases.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {actions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="group flex flex-col items-start p-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow-xl hover:border-teal-500/50 dark:hover:border-teal-500/50 transition-all duration-300 text-left relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 dark:bg-teal-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-teal-500/20 transition-all duration-500" />
            <span className="text-4xl mb-4 relative z-10">{action.icon}</span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 relative z-10 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
              {action.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400 relative z-10">{action.description}</p>
            <div className="mt-4 text-xs font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              Configure
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
