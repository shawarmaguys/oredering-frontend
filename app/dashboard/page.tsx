'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from './components/AdminDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import WorkerDashboard from './components/WorkerDashboard';
import StockTakeForm from './components/StockTakeForm';

export default function DashboardPage() {
  const { user } = useAuth();
  const [recordId, setRecordId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const rid = params.get('recordId');
      if (rid) {
        setRecordId(rid);
      }
    }
  }, []);

  const handleClose = () => {
    setRecordId(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('recordId');
      window.history.pushState(null, '', url.pathname + url.search);
    }
  };

  if (!user) return null;

  if (recordId) {
    return (
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px' }}>
        <StockTakeForm recordId={recordId} onClose={handleClose} />
      </div>
    );
  }

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
