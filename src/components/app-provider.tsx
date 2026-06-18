"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { TenantRole } from "@/types/pos";

export type Membership = {
  tenantId: string;
  tenantName?: string;
  role: TenantRole;
  branchIds: string[];
};

type AuthContextValue = {
  user: { uid: string; email: string; name: string } | null;
  displayName: string;
  email: string;
  tenantId: string | null;
  role: TenantRole;
  branchIds: string[];
  branchActive: string;
  memberships: Membership[];
  loading: boolean;
  needsTenantSelection: boolean;
  needsOnboarding: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  refreshMemberships: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  setBranchActive: (branchId: string) => void;
  isSuperAdmin: boolean;
  isAuthLoaded: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ uid: string; email: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [role, setRole] = useState<TenantRole>("cashier");
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [branchActive, setBranchActive] = useState<string>("main");
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        setUser(null);
        setTenantId(null);
        setMemberships([]);
        return;
      }
      const data = await res.json();
      if (data.user) {
        setUser({ uid: data.user.uid, email: data.user.email, name: data.user.name });
        setTenantId(data.user.tenantId);
        setRole(data.user.role);
        setBranchIds(data.user.branchIds);
        setMemberships(data.user.memberships || []);
        setNeedsOnboarding(data.user.needsOnboarding);
        setIsSuperAdmin(data.user.isSuperAdmin || false);
        if (data.user.branchIds?.length) {
          const first = data.user.branchIds.find((b: string) => b !== "*") ?? "main";
          setBranchActive(first);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Failed to fetch session", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      let errorMessage = "Login gagal. Silakan periksa kembali email dan password Anda.";
      try {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } else {
          // Consume text to prevent hanging
          await res.text();
        }
      } catch (e) {
        console.error("Error parsing response:", e);
      }
      throw new Error(errorMessage);
    }
    await fetchSession();
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setTenantId(null);
    setMemberships([]);
    window.location.href = "/login";
  };

  const switchTenant = async (nextTenantId: string) => {
    const res = await fetch("/api/tenants/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: nextTenantId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Gagal ganti tenant.");
    }
    await fetchSession();
  };

  const refreshSession = async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/refresh", { method: "POST" });
      if (!res.ok) return false;
      await fetchSession();
      return true;
    } catch {
      return false;
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      displayName: user?.name ?? user?.email ?? "",
      email: user?.email ?? "",
      tenantId,
      role,
      branchIds,
      branchActive,
      memberships,
      loading,
      needsTenantSelection: Boolean(user) && memberships.length > 1 && !tenantId,
      needsOnboarding,
      login,
      logout,
      switchTenant,
      refreshMemberships: fetchSession,
      refreshSession,
      setBranchActive,
      isSuperAdmin,
      isAuthLoaded: !loading,
    }),
    [
      branchActive,
      branchIds,
      loading,
      memberships,
      needsOnboarding,
      role,
      tenantId,
      user,
      isSuperAdmin,
      fetchSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AppProvider.");
  }
  return context;
};
