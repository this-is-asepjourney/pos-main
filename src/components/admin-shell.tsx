"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Store,
  UsersRound,
  ChevronRight,
  Wallet,
  Bell,
  MessageSquareWarning,
} from "lucide-react";
import { useAuth } from "@/components/app-provider";
import { BrandMark } from "@/components/brand-mark";
import { clsx } from "clsx";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/tenants", label: "Tenants", icon: Building2, exact: false },
  { href: "/admin/users", label: "Users", icon: UsersRound, exact: false },
  { href: "/admin/plans", label: "Plans", icon: CreditCard, exact: false },
  { href: "/admin/payments", label: "Pembayaran", icon: Wallet, exact: false },
  { href: "/admin/notifications", label: "Notifikasi", icon: Bell, exact: false },
  { href: "/admin/feedbacks", label: "Feedbacks", icon: MessageSquareWarning, exact: false },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { isSuperAdmin, logout, isAuthLoaded, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isAuthLoaded) return;
    if (!user || !isSuperAdmin) {
      router.replace("/login");
    }
  }, [isAuthLoaded, isSuperAdmin, user, router]);

  // Don't render children until auth is confirmed — prevents pages from
  // firing fetch() with a stale token before the cookie is refreshed by /api/auth/me
  if (!mounted || !isAuthLoaded || !isSuperAdmin) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 animate-pulse" />
          <p className="text-sm font-bold text-slate-400">Memverifikasi akses…</p>
        </div>
      </div>
    );
  }


  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col fixed left-0 top-0 h-full border-r border-slate-200 bg-white z-30">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-100">
          <Link href="/admin" aria-label="Bro-POS Admin">
            <BrandMark />
            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-2.5 py-0.5">
              <ShieldCheck size={10} className="text-white" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Super Admin</span>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition group",
                  active
                    ? "bg-slate-950 text-white shadow-lg shadow-slate-950/20"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon size={17} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight size={13} className="opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* User + Actions */}
        <div className="px-3 pb-4 space-y-2 border-t border-slate-100 pt-3">
          {/* User info */}
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                {user?.name?.charAt(0).toUpperCase() ?? "A"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 truncate">{user?.name ?? "Admin"}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>
          <Link
            href="/"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <Store size={14} />
            Kembali ke POS
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            <LogOut size={14} />
            Keluar
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <Link href="/admin"><BrandMark /></Link>
        <nav className="flex gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={clsx("rounded-xl p-2 transition", active ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-100")}>
                <Icon size={16} />
              </Link>
            );
          })}
          <button onClick={logout} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 transition">
            <LogOut size={16} />
          </button>
        </nav>
      </div>

      {/* Main */}
      <main className="flex-1 lg:ml-64 min-w-0 lg:pt-0 pt-14">
        {children}
      </main>
    </div>
  );
}
