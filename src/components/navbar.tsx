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
  { href: "/dashboard", label: "Dashboard", icon: BarChart3, roles: ["admin"] as UserRole[] },
  { href: "/products", label: "Produk", icon: Boxes, roles: ["admin"] as UserRole[] },
  { href: "/returns", label: "Pengembalian", icon: Undo2, roles: ["admin", "cashier"] as UserRole[] },
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

  return (
    <aside className="sticky top-0 z-50 flex w-full flex-col bg-slate-950/95 text-white backdrop-blur-md lg:static lg:min-h-screen lg:w-72 lg:bg-slate-950 lg:backdrop-blur-none lg:border-r lg:border-white/10 lg:px-5 lg:py-6">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 lg:block lg:border-none lg:p-0">
        <Link href="/" aria-label="JIROLU home">
          <BrandMark textClassName="text-white" />
        </Link>
        <div className="flex items-center gap-3 lg:hidden">
          {!isConfigured && (
            <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 ring-1 ring-amber-400/30">
              DEMO
            </span>
          )}
          <div className="text-right">
            <p className="text-xs font-bold leading-none">{displayName}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-emerald-400">{role}</p>
          </div>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto p-2 scrollbar-hide lg:mt-4 lg:flex-col lg:gap-2 lg:overflow-visible lg:p-0">
        {navItems
          .filter((item) => item.roles.includes(role))
          .map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition lg:rounded-2xl lg:py-3",
                active
                  ? "bg-white text-slate-950 shadow-lg shadow-black/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon size={18} />
              <span className="min-w-max">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden rounded-3xl border border-white/10 bg-white/5 p-4 lg:block">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Operator Aktif</p>
        <p className="mt-2 font-black tracking-tight">{displayName}</p>
        <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-400">{role}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-black text-slate-200 transition hover:bg-white/15"
        >
          <LogOut size={16} />
          Keluar
        </button>
      </div>
    </aside>
  );
}
