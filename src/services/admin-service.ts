import type { AdminStats, AdminTenant, AdminUser, AdminPlan } from "@/types/pos";

class AdminApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminApiError";
  }
}

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new AdminApiError(data.error || "Terjadi kesalahan server");
  }

  return data as T;
}

// Stats
export const getAdminStats = () => fetchApi<AdminStats>("/api/admin/stats");

// Tenants
export const getAdminTenants = () => fetchApi<AdminTenant[]>("/api/admin/tenants");

export const createAdminTenant = (payload: { name: string; ownerUid: string; plan?: string }) =>
  fetchApi<{ tenantId: string }>("/api/admin/tenants", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateAdminTenant = (id: string, payload: { name: string; status: string; plan: string }) =>
  fetchApi<{ success: boolean }>(`/api/admin/tenants/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteAdminTenant = (id: string) =>
  fetchApi<{ success: boolean }>(`/api/admin/tenants/${id}`, {
    method: "DELETE",
  });

// Users
export const getAdminUsers = () => fetchApi<AdminUser[]>("/api/admin/users");

export const createAdminUser = (payload: any) =>
  fetchApi<{ userId: string }>("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateAdminUser = (id: string, payload: any) =>
  fetchApi<{ success: boolean }>(`/api/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteAdminUser = (id: string) =>
  fetchApi<{ success: boolean }>(`/api/admin/users/${id}`, {
    method: "DELETE",
  });

// Plans
export const getAdminPlans = () => fetchApi<AdminPlan[]>("/api/admin/plans");

export const createAdminPlan = (payload: any) =>
  fetchApi<{ success: boolean }>("/api/admin/plans", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateAdminPlan = (id: string, payload: any) =>
  fetchApi<{ success: boolean }>(`/api/admin/plans/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteAdminPlan = (id: string) =>
  fetchApi<{ success: boolean }>(`/api/admin/plans/${id}`, {
    method: "DELETE",
  });
