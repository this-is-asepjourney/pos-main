"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Store,
  UsersRound,
} from "lucide-react";
import { useAuth } from "@/components/app-provider";
import { BrandMark } from "@/components/brand-mark";
import { clsx } from "clsx";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/tenants", label: "Tenants", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: UsersRound },
  { href: "/admin/plans", label: "Plans", icon: ShieldCheck },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { isSuperAdmin, logout, isAuthLoaded } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isAuthLoaded && !isSuperAdmin) {
      router.replace("/login");
    }
  }, [isAuthLoaded, isSuperAdmin, router]);

  if (!mounted || !isAuthLoaded || !isSuperAdmin) {
    return null; // Return null during SSR and while checking auth
  }

  return (
    <div className="flex min-h-screen bg-slate-50 lg:flex-row flex-col text-slate-900">
      <aside className="flex w-full flex-col gap-6 border-b border-slate-200 bg-white px-4 py-4 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-5">
        <div className="flex items-center justify-between lg:block">
          <Link href="/admin" aria-label="Bro-POS Admin">
            <BrandMark />
            <p className="mt-1 text-xs font-black uppercase tracking-widest text-emerald-600">
              Super Admin
            </p>
          </Link>
        </div>

        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex min-w-max items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                  active
                    ? "bg-slate-950 text-white shadow-lg shadow-black/20"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto hidden rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:block">
          <Link
            href="/"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 mb-2"
          >
            <Store size={16} />
            Kembali ke POS
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-300"
          >
            <LogOut size={16} />
            Keluar Admin
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden min-w-0">{children}</main>
    </div>
  );
}
