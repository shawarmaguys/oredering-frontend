const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_URL}/v1${path}`, {
    cache: 'no-store',
    ...options,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (_) {
      // JSON parsing failed, use fallback message
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  users: {
    list: () => request<any[]>('/users'),
    create: (data: any) => request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
    get: (id: string) => request<any>(`/users/${id}`),
    update: (id: string, data: any) => request<any>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/users/${id}`, { method: 'DELETE' }),
  },
  locations: {
    list: () => request<any[]>('/locations'),
    create: (data: any) => request<any>('/locations', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/locations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    getItems: (locationId: string) => request<any[]>(`/locations/${locationId}/items`),
    addOrUpdateItem: (locationId: string, data: any) => request<any>(`/locations/${locationId}/items`, { method: 'POST', body: JSON.stringify(data) }),
    removeItem: (locationId: string, itemId: string) => request<any>(`/locations/${locationId}/items/${itemId}`, { method: 'DELETE' }),
    getDepartments: (locationId: string) => request<any[]>(`/locations/${locationId}/departments`),
    addOrUpdateDepartment: (locationId: string, data: any) => request<any>(`/locations/${locationId}/departments`, { method: 'POST', body: JSON.stringify(data) }),
    removeDepartment: (locationId: string, departmentId: string) => request<any>(`/locations/${locationId}/departments/${departmentId}`, { method: 'DELETE' }),
  },
  vendors: {
    list: (departmentId?: string) => {
      const query = departmentId ? `?department_id=${departmentId}` : '';
      return request<any[]>(`/vendors${query}`);
    },
    create: (data: any) => request<any>('/vendors', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/vendors/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/vendors/${id}`, { method: 'DELETE' }),
    departments: () => request<any[]>('/vendors/departments'),
  },
  departments: {
    list: () => request<any[]>('/vendors/departments'),
    create: (data: any) => request<any>('/vendors/departments', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/vendors/departments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/vendors/departments/${id}`, { method: 'DELETE' }),
  },
  productTypes: {
    list: (includeInactive?: boolean) => {
      const query = includeInactive ? '?includeInactive=true' : '';
      return request<any[]>(`/product-types${query}`);
    },
    get: (id: string) => request<any>(`/product-types/${id}`),
    create: (data: any) => request<any>('/product-types', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/product-types/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/product-types/${id}`, { method: 'DELETE' }),
  },
  items: {
    list: (params?: { vendorId?: string; productTypeId?: string; search?: string; page?: number; limit?: number; sortBy?: string; sortOrder?: string }) => {
      const q = new URLSearchParams();
      if (params?.vendorId) q.set('vendor_id', params.vendorId);
      if (params?.productTypeId) q.set('product_type_id', params.productTypeId);
      if (params?.search) q.set('search', params.search);
      if (params?.page != null) q.set('page', String(params.page));
      if (params?.limit != null) q.set('limit', String(params.limit));
      if (params?.sortBy) q.set('sortBy', params.sortBy);
      if (params?.sortOrder) q.set('sortOrder', params.sortOrder);
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>(`/items${query}`);
    },
    create: (data: any) => request<any>('/items', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/items/${id}`, { method: 'DELETE' }),
  },
  schedules: {
    list: () => request<any[]>('/schedules'),
    create: (data: any) => request<any>('/schedules', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/schedules/${id}`, { method: 'DELETE' }),
    trigger: (id: string) => request<any>(`/schedules/${id}/trigger`, { method: 'POST' }),
  },
  translations: {
    list: () => request<any[]>('/translations'),
    create: (data: any) => request<any>('/translations', { method: 'POST', body: JSON.stringify(data) }),
    translateText: (text: string) => request<{ success: boolean; original: string; translated: string }>(`/translations/translate?text=${encodeURIComponent(text)}`),
  },
  stockRecords: {
    list: (params?: { page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.page != null) q.set('page', String(params.page));
      if (params?.limit != null) q.set('limit', String(params.limit));
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<any>(`/stock-records${query}`);
    },
    get: (id: string) => request<any>(`/stock-records/${id}`),
    create: (data: any) => request<any>('/stock-records', { method: 'POST', body: JSON.stringify(data) }),
    complete: (id: string, data: any) => request<any>(`/stock-records/${id}/complete`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  purchaseOrders: {
    list: (params?: { status?: string; page?: number; limit?: number } | string) => {
      const q = new URLSearchParams();
      if (typeof params === 'string') {
        if (params) q.set('status', params);
      } else if (params) {
        if (params.status) q.set('status', params.status);
        if (params.page != null) q.set('page', String(params.page));
        if (params.limit != null) q.set('limit', String(params.limit));
      }
      const query = q.toString() ? `?${q.toString()}` : '';
      return request<any>(`/purchase-orders${query}`);
    },
    get: (id: string) => request<any>(`/purchase-orders/${id}`),
    create: (data: any) => request<any>('/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/purchase-orders/${id}`, { method: 'POST', body: JSON.stringify(data) }),
    approve: (id: string) => request<any>(`/purchase-orders/${id}/approve`, { method: 'POST' }),
    send: (id: string, data: { emails: string[]; subject?: string; body?: string; notes?: string }) =>
      request<any>(`/purchase-orders/${id}/send`, { method: 'POST', body: JSON.stringify(data) }),
    getPdfUrl: (id: string) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
      return `${API_URL}/v1/purchase-orders/${id}/pdf${tokenParam}`;
    },
  },
};
