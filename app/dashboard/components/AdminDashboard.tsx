'use client';

export default function AdminDashboard() {
  const actions = [
    { title: 'Add Location', icon: '📍', description: 'Register a new store location' },
    { title: 'Add Vendor', icon: '🏢', description: 'Onboard a new supplier or vendor' },
    { title: 'Add Product', icon: '📦', description: 'Create a new stock product' },
    { title: 'Add User', icon: '👤', description: 'Register a new employee account' },
    { title: 'Set Permissions', icon: '🔐', description: 'Manage user access and roles' },
    { title: 'View Reports', icon: '📊', description: 'Analyze stock and purchase reports' },
  ];

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Admin Overview</h1>
        <p className="text-gray-500 dark:text-zinc-400 mt-2">Manage system entities and view global reports.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {actions.map((action) => (
          <button
            key={action.title}
            className="group flex flex-col items-start p-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow-xl hover:border-teal-500/50 dark:hover:border-teal-500/50 transition-all duration-300 text-left relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 dark:bg-teal-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-teal-500/20 transition-all duration-500" />
            <span className="text-4xl mb-4 relative z-10">{action.icon}</span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 relative z-10">{action.title}</h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400 relative z-10">{action.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
