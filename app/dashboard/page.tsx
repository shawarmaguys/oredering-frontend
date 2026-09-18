'use client';

import { Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams, useRouter } from 'next/navigation';
import AdminDashboard from './components/AdminDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import WorkerDashboard from './components/WorkerDashboard';
import StockTakeForm from './components/StockTakeForm';

function DashboardContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const recordId = searchParams.get('recordId');

  const handleClose = () => {
    router.replace('/dashboard');
  };

  if (recordId) {
    return (
      <div
        style={{
          maxWidth: '860px',
          width: '100%',
          height: '100%',
          minHeight: 0,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: '4px 4px 8px 4px',
        }}
      >
        <StockTakeForm recordId={recordId} onClose={handleClose} />
      </div>
    );
  }

  if (!user) return null;

  switch (user.role) {
    case 'ADMIN':
      return <AdminDashboard />;
    case 'MANAGER':
      return <ManagerDashboard />;
    case 'WORKER':
      return <WorkerDashboard />;
    default:
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-xl text-red-500 font-bold">Unauthorized Role</p>
        </div>
      );
  }
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}
