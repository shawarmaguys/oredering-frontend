'use client';

export default function ManagerDashboard() {
  const pendingReviews = [
    { id: 'FRM-1002', location: 'Downtown Store', submittedBy: 'John (Worker)', time: '10 mins ago' },
    { id: 'FRM-1003', location: 'Uptown Store', submittedBy: 'Sarah (Worker)', time: '1 hour ago' },
  ];

  return (
    <div className="space-y-8">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Manager Portal</h1>
        <p className="text-gray-500 dark:text-zinc-400 mt-2">Review stock submissions and manage Purchase Orders.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Actions & Alerts */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gradient-to-br from-teal-500 to-emerald-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10" />
            <h2 className="text-xl font-bold mb-2">Create New PO</h2>
            <p className="text-teal-100 text-sm mb-6">Manually generate a Purchase Order and dispatch emails to vendors.</p>
            <button className="w-full bg-white text-teal-900 font-bold py-3 px-4 rounded-xl shadow hover:shadow-lg transform hover:-translate-y-0.5 transition-all">
              Create Purchase Order
            </button>
          </div>
        </div>

        {/* Right Column - Pending Tasks */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-gray-200 dark:border-zinc-800 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pending Stock Reviews</h2>
              <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-bold px-3 py-1 rounded-full">
                {pendingReviews.length} Requires Action
              </span>
            </div>

            <div className="space-y-4">
              {pendingReviews.map((review) => (
                <div key={review.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-800">
                  <div className="mb-4 sm:mb-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-gray-900 dark:text-white">{review.id}</span>
                      <span className="text-gray-400 dark:text-zinc-500 text-sm">• {review.time}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1">
                      {review.location} - Submitted by {review.submittedBy}
                    </p>
                  </div>
                  <button className="bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-500/20 font-semibold py-2 px-5 rounded-xl transition-colors">
                    Review & Fix Values
                  </button>
                </div>
              ))}

              {pendingReviews.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl mb-3 block">🎉</span>
                  <p>All caught up! No pending reviews.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
