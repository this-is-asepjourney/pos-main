"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/components/app-provider";
import type { TenantRole } from "@/types/pos";

type AppShellProps = {
  children: ReactNode;
  allowedRoles?: TenantRole[];
};

const isRoleAllowed = (role: TenantRole, allowed: TenantRole[]) => {
  if (!allowed.length) return true;
  if (allowed.includes(role)) return true;
  // Owner mewarisi semua kemampuan admin.
  if (role === "owner" && allowed.includes("admin")) return true;
  return false;
};

export function AppShell({ children, allowedRoles }: AppShellProps) {
  const { user, role, loading, tenantId, needsOnboarding } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user && needsOnboarding) {
      router.replace("/onboarding");
      return;
    }

    if (user && !tenantId && !needsOnboarding) {
      router.replace("/select-tenant");
      return;
    }

    if (allowedRoles?.length && !isRoleAllowed(role, allowedRoles)) {
      router.replace(role === "cashier" ? "/" : "/dashboard");
    }
  }, [allowedRoles, loading, needsOnboarding, role, router, tenantId, user]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100">
        <p className="text-sm font-semibold text-slate-500">Memuat sesi pengguna...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100">
        <p className="text-sm font-semibold text-slate-500">Mengalihkan ke halaman login...</p>
      </div>
    );
  }

  if (user && (needsOnboarding || !tenantId)) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100">
        <p className="text-sm font-semibold text-slate-500">Menyiapkan toko Anda...</p>
      </div>
    );
  }

  if (allowedRoles?.length && !isRoleAllowed(role, allowedRoles)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <Navbar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
