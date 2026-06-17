"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Building2,
  Clock3,
  CreditCard,
  LogOut,
  ReceiptText,
  ShoppingCart,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/components/app-provider";
import { BrandMark } from "@/components/brand-mark";
import { clsx } from "clsx";
import type { TenantRole } from "@/types/pos";

const ALL_ROLES: TenantRole[] = ["owner", "admin", "cashier"];
const MANAGER_ROLES: TenantRole[] = ["owner", "admin"];

const navItems = [
  { href: "/", label: "Kasir", icon: ShoppingCart, roles: ALL_ROLES },
  { href: "/attendance", label: "Absensi", icon: Clock3, roles: ALL_ROLES },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3, roles: MANAGER_ROLES },
  { href: "/products", label: "Produk", icon: Boxes, roles: MANAGER_ROLES },
  { href: "/transactions", label: "Transaksi", icon: ReceiptText, roles: MANAGER_ROLES },
  { href: "/subscription", label: "Subscription", icon: CreditCard, roles: MANAGER_ROLES },
];


export function Navbar() {
  const pathname = usePathname();
  const {
    displayName,
    logout,
    role,
    tenantId,
    memberships,
    isSuperAdmin,
  } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const activeMembership = memberships.find((m) => m.tenantId === tenantId);

  return (
    <aside className="flex w-full flex-col gap-6 border-b border-white/10 bg-slate-950 px-4 py-4 text-white lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-5">
      <div className="flex items-center justify-between lg:block">
        <Link href="/" aria-label="Bro-POS home">
          <BrandMark textClassName="text-white" />
        </Link>
      </div>

      {tenantId ? (
        <Link
          href="/select-tenant"
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-bold text-white transition hover:bg-white/10"
        >
          <Building2 size={18} className="text-cyan-300" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] uppercase tracking-[0.16em] text-slate-400">
              Toko aktif
            </p>
            <p className="truncate font-black text-white">
              {activeMembership?.tenantName ?? tenantId}
            </p>
          </div>
        </Link>
      ) : null}

      <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
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
                  "flex min-w-max items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                  active
                    ? "bg-white text-slate-950 shadow-lg shadow-black/20"
                    : "text-slate-300 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        {isSuperAdmin ? (
          <div className="mt-4 border-t border-white/10 pt-4 hidden lg:block">
            <Link
              href="/admin"
              className="flex min-w-max items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-emerald-400 hover:bg-white/10 transition"
            >
              <ShieldCheck size={18} />
              Admin Panel
            </Link>
          </div>
        ) : null}
      </nav>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 lg:hidden">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Operator</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">{displayName}</p>
            <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-300">{role}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-slate-200"
          >
            Keluar
          </button>
        </div>
      </div>

      <div className="mt-auto hidden rounded-3xl border border-white/10 bg-white/5 p-4 lg:block">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Operator</p>
        <p className="mt-2 font-semibold">{displayName}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-cyan-300">{role}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/15"
        >
          <LogOut size={16} />
          Keluar
        </button>
      </div>
    </aside>
  );
}
