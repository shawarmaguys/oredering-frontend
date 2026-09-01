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

export interface ProductType {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isActive: boolean;
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface ProductTypesContextType {
  productTypes: ProductType[];
  productTypesLoading: boolean;
  initialized: boolean;
  refreshProductTypes: () => Promise<void>;
  ensureLoaded: () => Promise<void>;
  createProductType: (data: { name: string; description?: string; color?: string }) => Promise<ProductType>;
  updateProductType: (id: string, data: Partial<ProductType>) => Promise<ProductType>;
  deleteProductType: (id: string) => Promise<void>;
}

const ProductTypesContext = createContext<ProductTypesContextType | undefined>(undefined);

export function ProductTypesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [productTypesLoading, setProductTypesLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const initializedRef = useRef(false);
  const inFlightPromise = useRef<Promise<void> | null>(null);

  const fetchAll = useCallback(async () => {
    if (!isAuthenticated) return;
    if (inFlightPromise.current) return inFlightPromise.current;

    setProductTypesLoading(true);
    const promise = (async () => {
      try {
        const data = await api.productTypes.list(true);
        setProductTypes(data || []);
      } catch (err) {
        console.error('[ProductTypesContext] Failed to load product types:', err);
      } finally {
        initializedRef.current = true;
        setIsInitialized(true);
        setProductTypesLoading(false);
        inFlightPromise.current = null;
      }
    })();

    inFlightPromise.current = promise;
    return promise;
  }, [isAuthenticated]);

  // Reset state on logout
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setProductTypes([]);
      initializedRef.current = false;
      setIsInitialized(false);
      inFlightPromise.current = null;
    }
  }, [isAuthenticated, authLoading]);

  const ensureLoaded = useCallback(async () => {
    if (!isAuthenticated) return;
    if (!initializedRef.current) {
      return fetchAll();
    }
  }, [fetchAll, isAuthenticated]);

  const refreshProductTypes = useCallback(async () => {
    if (!isAuthenticated) return;
    initializedRef.current = false;
    setIsInitialized(false);
    await fetchAll();
  }, [fetchAll, isAuthenticated]);

  const createProductType = useCallback(async (data: { name: string; description?: string; color?: string }) => {
    const newPt = await api.productTypes.create(data);
    await refreshProductTypes();
    return newPt;
  }, [refreshProductTypes]);

  const updateProductType = useCallback(async (id: string, data: Partial<ProductType>) => {
    const updated = await api.productTypes.update(id, data);
    await refreshProductTypes();
    return updated;
  }, [refreshProductTypes]);

  const deleteProductType = useCallback(async (id: string) => {
    await api.productTypes.delete(id);
    await refreshProductTypes();
  }, [refreshProductTypes]);

  return (
    <ProductTypesContext.Provider
      value={{
        productTypes,
        productTypesLoading,
        initialized: isInitialized,
        refreshProductTypes,
        ensureLoaded,
        createProductType,
        updateProductType,
        deleteProductType,
      }}
    >
      {children}
    </ProductTypesContext.Provider>
  );
}

export function useProductTypes() {
  const ctx = useContext(ProductTypesContext);
  if (!ctx) throw new Error('useProductTypes must be used within a ProductTypesProvider');

  useEffect(() => {
    ctx.ensureLoaded();
  }, [ctx]);

  return ctx;
}
