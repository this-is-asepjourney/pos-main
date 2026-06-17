import type { AdminStats, AdminTenant, AdminUser, AdminPlan } from "@/types/pos";

export class AdminApiError extends Error {
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

export const getAdminTenantDetail = (id: string) =>
  fetchApi<{ tenant: AdminTenantDetail; members: AdminMember[]; branches: AdminBranch[]; recentTransactions: AdminTransaction[] }>(
    `/api/admin/tenants/${id}`
  );

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

export const getAdminUserDetail = (id: string) =>
  fetchApi<{ user: AdminUserDetail; memberships: AdminUserMembership[] }>(`/api/admin/users/${id}`);

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

// Subscription Requests
export const getSubscriptionRequests = (status?: string, search?: string) => {
  const params = new URLSearchParams();
  if (status && status !== "all") params.set("status", status);
  if (search) params.set("search", search);
  const qs = params.toString();
  return fetchApi<{
    requests: AdminSubscriptionRequest[];
    stats: AdminRequestStats;
  }>(`/api/admin/subscription-requests${qs ? `?${qs}` : ""}`);
};

export const approveSubscriptionRequest = (
  id: string,
  payload: { paymentMethod?: string; adminNote?: string }
) =>
  fetchApi<{ success: boolean; message: string }>(
    `/api/admin/subscription-requests/${id}/approve`,
    { method: "POST", body: JSON.stringify(payload) }
  );

export const rejectSubscriptionRequest = (
  id: string,
  payload: { adminNote?: string }
) =>
  fetchApi<{ success: boolean; message: string }>(
    `/api/admin/subscription-requests/${id}/reject`,
    { method: "POST", body: JSON.stringify(payload) }
  );

// Extended types for detail views
export type AdminUserDetail = {
  id: string;
  email: string;
  name: string;
  isSuperadmin: boolean;
  defaultTenantId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminUserMembership = {
  memberId: string;
  role: string;
  memberStatus: string;
  joinedAt: string;
  tenantId: string;
  tenantName: string;
  slug: string;
  tenantStatus: string;
  plan: string;
  subStatus: string;
  planId: string;
  trialEndsAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  lastPaymentAt: string | null;
  memberCount: number;
  productCount: number;
  totalRevenue: number;
};

export type AdminTenantDetail = {
  id: string;
  name: string;
  slug: string;
  ownerUid: string;
  ownerName: string;
  ownerEmail: string;
  status: string;
  plan: string;
  branchCount: number;
  settings: any;
  createdAt: string;
  subStatus: string;
  planId: string;
  trialEndsAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  lastPaymentAt: string | null;
  memberCount: number;
  productCount: number;
  totalRevenue: number;
  totalTransactions: number;
};

export type AdminMember = {
  id: string;
  role: string;
  status: string;
  joinedAt: string;
  userId: string;
  name: string;
  email: string;
};

export type AdminBranch = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
};

export type AdminTransaction = {
  id: string;
  invoiceCode: string;
  totalPrice: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
};

export type AdminSubscriptionRequest = {
  id: string;
  tenantId: string;
  tenantName: string;
  requestedPlanId: string;
  requestedPlanName: string;
  currentPlanId: string;
  paymentMethod: string;
  paymentProofNote: string | null;
  amountIdr: number;
  status: "pending" | "approved" | "rejected" | "cancelled";
  adminNote: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tenantSlug: string;
  tenantCurrentPlan: string;
  tenantStatus: string;
  ownerName: string;
  ownerEmail: string;
};

export type AdminRequestStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  totalApprovedRevenue: number;
};

