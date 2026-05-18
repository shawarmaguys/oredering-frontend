'use client';

export default function WorkerDashboard() {
  return (
    <div className="space-y-6">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Store Portal</h1>
        <p className="text-gray-500 dark:text-zinc-400 mt-2">Manage daily stock checks and submit forms.</p>
      </header>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-8">
            <div className="bg-amber-100 text-amber-600 p-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Action Required</h2>
              <p className="text-sm text-gray-500 dark:text-zinc-400">Please complete today's End of Day stock form.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">End of Day Stock Form</h3>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Due in 2 hours</p>
              </div>
              <button className="bg-teal-500 hover:bg-teal-400 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-teal-500/30 transform hover:-translate-y-0.5 transition-all">
                Start Form
              </button>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-75">
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Morning Inventory Check</h3>
                <p className="text-sm text-green-600 dark:text-green-400 font-semibold mt-1 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                  Completed
                </p>
              </div>
              <button disabled className="bg-gray-200 dark:bg-zinc-700 text-gray-400 dark:text-zinc-500 font-bold py-3 px-6 rounded-xl cursor-not-allowed">
                Submitted
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
