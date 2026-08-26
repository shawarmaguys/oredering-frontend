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
import { useAuth } from './AuthContext';

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
  initialized: boolean;
  refreshUsers: () => Promise<void>;
  ensureLoaded: () => Promise<void>;
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

export function UsersProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const initializedRef = useRef(false);
  const inFlightPromise = useRef<Promise<void> | null>(null);

  const fetchAll = useCallback(async () => {
    if (inFlightPromise.current) return inFlightPromise.current;

    // Skip API request for non-admins to avoid Forbidden resource errors
    if (user && user.role !== 'ADMIN' && user.role !== 'SUPER_MANAGER') {
      setUsers([]);
      initializedRef.current = true;
      setIsInitialized(true);
      return;
    }

    setUsersLoading(true);
    const promise = (async () => {
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
        initializedRef.current = true;
        setIsInitialized(true);
      } catch (err: any) {
        if (err?.message?.includes('Forbidden')) {
          setUsers([]);
          initializedRef.current = true;
          setIsInitialized(true);
        } else {
          console.error('[UsersContext] Failed to load users:', err);
        }
      } finally {
        setUsersLoading(false);
        inFlightPromise.current = null;
      }
    })();

    inFlightPromise.current = promise;
    return promise;
  }, [user]);

  const ensureLoaded = useCallback(async () => {
    if (!initializedRef.current) {
      return fetchAll();
    }
  }, [fetchAll]);

  const refreshUsers = useCallback(async () => {
    initializedRef.current = false;
    setIsInitialized(false);
    await fetchAll();
  }, [fetchAll]);

  return (
    <UsersContext.Provider
      value={{
        users,
        usersLoading,
        initialized: isInitialized,
        refreshUsers,
        ensureLoaded,
      }}
    >
      {children}
    </UsersContext.Provider>
  );
}

export function useUsers() {
  const ctx = useContext(UsersContext);
  if (!ctx) throw new Error('useUsers must be used within a UsersProvider');

  useEffect(() => {
    ctx.ensureLoaded();
  }, [ctx]);

  return ctx;
}

