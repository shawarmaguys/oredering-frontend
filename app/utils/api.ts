const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_URL}/v1${path}`, {
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
  items: {
    list: (vendorId?: string) => {
      const query = vendorId ? `?vendor_id=${vendorId}` : '';
      return request<any[]>(`/items${query}`);
    },
    create: (data: any) => request<any>('/items', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/items/${id}`, { method: 'DELETE' }),
  },
  schedules: {
    list: () => request<any[]>('/schedules'),
    create: (data: any) => request<any>('/schedules', { method: 'POST', body: JSON.stringify(data) }),
    trigger: (id: string) => request<any>(`/schedules/${id}/trigger`, { method: 'POST' }),
  },
  translations: {
    list: () => request<any[]>('/translations'),
    create: (data: any) => request<any>('/translations', { method: 'POST', body: JSON.stringify(data) }),
  },
  stockRecords: {
    list: () => request<any[]>('/stock-records'),
    get: (id: string) => request<any>(`/stock-records/${id}`),
    create: (data: any) => request<any>('/stock-records', { method: 'POST', body: JSON.stringify(data) }),
    complete: (id: string, data: any) => request<any>(`/stock-records/${id}/complete`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  purchaseOrders: {
    list: (status?: string) => {
      const query = status ? `?status=${status}` : '';
      return request<any[]>(`/purchase-orders${query}`);
    },
    get: (id: string) => request<any>(`/purchase-orders/${id}`),
    create: (data: any) => request<any>('/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
    approve: (id: string) => request<any>(`/purchase-orders/${id}/approve`, { method: 'POST' }),
  },
};
