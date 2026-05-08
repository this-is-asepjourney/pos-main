"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/components/app-provider";
import type { UserRole } from "@/types/pos";

type AppShellProps = {
  children: ReactNode;
  allowedRoles?: UserRole[];
};

export function AppShell({ children, allowedRoles }: AppShellProps) {
  const { user, role, isConfigured, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (isConfigured && !user) {
      router.replace("/login");
      return;
    }

    if (allowedRoles?.length && !allowedRoles.includes(role)) {
      router.replace(role === "admin" ? "/dashboard" : "/");
    }
  }, [allowedRoles, isConfigured, loading, role, router, user]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <p className="text-sm font-semibold text-slate-500">Memuat sesi pengguna...</p>
      </div>
    );
  }

  if (isConfigured && !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <p className="text-sm font-semibold text-slate-500">Mengalihkan ke halaman login...</p>
      </div>
    );
  }
  
  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    return null;
  }

  return (
    <div className="min-h-screen lg:flex">
      <Navbar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
