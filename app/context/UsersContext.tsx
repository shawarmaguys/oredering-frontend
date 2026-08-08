'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { api } from '../utils/api';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'WORKER' | 'MANAGER' | 'ADMIN' | 'SUPER_MANAGER';
  isActive: boolean;
  createdAt: string;
  locationIds?: string[];
}

interface UsersContextType {
  users: User[];
  usersLoading: boolean;
  refreshUsers: () => Promise<void>;
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

export function UsersProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const initialized = useRef(false);
  const fetchingRef = useRef(false);

  const fetchAll = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setUsersLoading(true);
    try {
      const data = await api.users.list();
      const mapped: User[] = data.map((u: any) => ({
        id: u.id,
        fullName: u.full_name || u.fullName,
        email: u.email,
        role: u.role,
        isActive:
          u.is_active !== undefined
            ? u.is_active
            : u.isActive !== undefined
              ? u.isActive
              : true,
        createdAt: u.created_at || u.createdAt,
        locationIds: u.locationIds || [],
      }));
      setUsers(mapped);
      initialized.current = true;
    } catch (err) {
      console.error('[UsersContext] Failed to load users:', err);
    } finally {
      setUsersLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!initialized.current) {
      fetchAll();
    }
  }, [fetchAll]);

  const refreshUsers = useCallback(async () => {
    initialized.current = false;
    await fetchAll();
  }, [fetchAll]);

  return (
    <UsersContext.Provider value={{ users, usersLoading, refreshUsers }}>
      {children}
    </UsersContext.Provider>
  );
}

export function useUsers() {
  const ctx = useContext(UsersContext);
  if (!ctx) throw new Error('useUsers must be used within a UsersProvider');
  return ctx;
}
