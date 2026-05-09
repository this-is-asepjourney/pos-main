"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Boxes, Clock3, LogOut, ReceiptText, ShoppingCart, Undo2 } from "lucide-react";
import { useAuth } from "@/components/app-provider";
import { BrandMark } from "@/components/brand-mark";
import { clsx } from "clsx";
import type { UserRole } from "@/types/pos";

const navItems = [
  { href: "/", label: "Kasir", icon: ShoppingCart, roles: ["admin", "cashier"] as UserRole[] },
  { href: "/attendance", label: "Absensi", icon: Clock3, roles: ["admin", "cashier"] as UserRole[] },
  { href: "/returns", label: "Return", icon: Undo2, roles: ["admin", "cashier"] as UserRole[] },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3, roles: ["admin"] as UserRole[] },
  { href: "/products", label: "Produk", icon: Boxes, roles: ["admin"] as UserRole[] },
  { href: "/transactions", label: "Transaksi", icon: ReceiptText, roles: ["admin"] as UserRole[] },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { displayName, isConfigured, logout, role } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <>
      {/* ─── Desktop & Tablet (lg+): Left Sidebar ─── */}
      <aside className="hidden lg:flex sticky top-0 z-50 min-h-screen w-64 xl:w-72 shrink-0 flex-col bg-slate-950 text-white border-r border-white/10 px-4 py-6 xl:px-5">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="JIROLU home">
            <BrandMark textClassName="text-white" />
          </Link>
          {!isConfigured && (
            <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 ring-1 ring-amber-400/30">
              DEMO
            </span>
          )}
        </div>

        <nav className="mt-6 flex flex-col gap-1.5">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition min-h-[44px]",
                  active
                    ? "bg-white text-slate-950 shadow-lg shadow-black/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Operator Aktif</p>
          <p className="mt-2 font-black tracking-tight truncate">{displayName}</p>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-400">{role}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-black text-slate-200 transition hover:bg-white/15 min-h-[44px]"
          >
            <LogOut size={16} />
            Keluar
          </button>
        </div>
      </aside>

      {/* ─── Mobile (< lg): Top Bar + Fixed Bottom Nav ─── */}
      <div className="lg:hidden">
        {/* Top app bar */}
        <header className="sticky top-0 z-50 flex items-center justify-between bg-slate-950/97 px-4 py-3 backdrop-blur-md border-b border-white/5">
          <Link href="/" aria-label="JIROLU home">
            <BrandMark textClassName="text-white" />
          </Link>
          <div className="flex items-center gap-2">
            {!isConfigured && (
              <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 ring-1 ring-amber-400/30">
                DEMO
              </span>
            )}
            <div className="text-right">
              <p className="max-w-[100px] truncate text-xs font-bold leading-none text-white">{displayName}</p>
              <p className="mt-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-400">{role}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-300 transition hover:bg-white/15"
              aria-label="Keluar"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Fixed bottom navigation bar */}
        <nav
          aria-label="Navigasi utama"
          className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch bg-slate-950/97 backdrop-blur-md border-t border-white/10"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 px-0.5 text-[9px] font-bold transition",
                  active ? "text-emerald-400" : "text-slate-500",
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                <span className="leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
