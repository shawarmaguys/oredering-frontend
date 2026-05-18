'use client';

import { useAuth } from '../context/AuthContext';
import AdminDashboard from './components/AdminDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import WorkerDashboard from './components/WorkerDashboard';

export default function DashboardPage() {
  const { user } = useAuth();

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
