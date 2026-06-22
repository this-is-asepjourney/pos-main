"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronRight,
  CreditCard,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  UsersRound,
  Wallet,
  Zap,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { getAdminStats, getAdminTenants, getAdminUsers } from "@/services/admin-service";
import type { AdminStats, AdminTenant, AdminUser } from "@/types/pos";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { clsx } from "clsx";

const planColor: Record<string, string> = {
  free: "bg-slate-100 text-slate-600",
  pro: "bg-indigo-100 text-indigo-700",
  business: "bg-amber-100 text-amber-700",
};
const statusColor: Record<string, string> = {
  active: "text-emerald-600 bg-emerald-50",
  trial: "text-cyan-600 bg-cyan-50",
  suspended: "text-rose-600 bg-rose-50",
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, tenantsData, usersData] = await Promise.all([
          getAdminStats(),
          getAdminTenants(),
          getAdminUsers(),
        ]);
        setStats(statsData);
        setTenants(tenantsData);
        setUsers(usersData);
      } catch (error) {
        console.error("Failed to fetch admin data:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const topTenants = [...tenants]
    .sort((a, b) => Number(b.totalRevenue) - Number(a.totalRevenue))
    .slice(0, 5);

  const recentUsers = [...users].slice(0, 5);

  const planDistribution = ["free", "pro", "business"].map((plan) => ({
    plan,
    count: tenants.filter((t) => t.plan === plan).length,
    total: tenants.length,
  }));

  return (
    <AdminShell>
      <div className="p-6 xl:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900">System Overview</h1>
            <p className="mt-1 text-sm text-slate-500">
              Monitoring global platform Bro-POS secara real-time.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-emerald-700">Live</span>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 rounded-3xl bg-slate-100 animate-pulse" />
            ))
          ) : (
            <>
              <StatCard
                label="Total Tenants"
                value={stats?.totalTenants ?? 0}
                sub={`${tenants.filter(t => t.status === "active").length} aktif`}
                icon={<Building2 size={20} />}
                gradient="from-cyan-500 to-teal-500"
                href="/admin/tenants"
              />
              <StatCard
                label="Total Users"
                value={stats?.totalUsers ?? 0}
                sub={`${users.filter(u => u.isSuperadmin).length} super admin`}
                icon={<UsersRound size={20} />}
                gradient="from-indigo-500 to-purple-500"
                href="/admin/users"
              />
              <StatCard
                label="Total Revenue"
                value={formatCurrency(stats?.totalRevenue ?? 0)}
                sub="Semua waktu"
                icon={<ReceiptText size={20} />}
                gradient="from-emerald-500 to-green-500"
              />
              <StatCard
                label="Langganan Aktif"
                value={stats?.activeSubscriptions ?? 0}
                sub="Subscription running"
                icon={<ShieldCheck size={20} />}
                gradient="from-amber-500 to-orange-500"
                href="/admin/plans"
              />
              <StatCard
                label="Pending Request"
                value={stats?.pendingRequests ?? 0}
                sub={(stats?.pendingRequests ?? 0) > 0 ? "⚡ Perlu ditinjau" : "Semua diproses"}
                icon={<Wallet size={20} />}
                gradient="from-rose-500 to-pink-500"
                href="/admin/payments"
                pulse={(stats?.pendingRequests ?? 0) > 0}
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Top Tenants by Revenue */}
          <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-500" />
                <p className="font-black text-slate-900">Top Toko by Revenue</p>
              </div>
              <Link href="/admin/tenants" className="text-xs font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1 transition">
                Lihat semua <ChevronRight size={12} />
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 rounded-2xl bg-slate-100 animate-pulse" />)}
              </div>
            ) : topTenants.length === 0 ? (
              <p className="text-sm text-slate-400 font-semibold text-center py-8">Belum ada data tenant.</p>
            ) : (
              <div className="space-y-2">
                {topTenants.map((tenant, idx) => (
                  <div key={tenant.id} className="flex items-center gap-3 rounded-2xl hover:bg-slate-50 p-2 transition">
                    <span className="size-7 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500 flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{tenant.name}</p>
                      <p className="text-xs text-slate-500">{tenant.ownerName}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-black uppercase", planColor[tenant.plan] ?? "bg-slate-100 text-slate-600")}>
                        {tenant.plan}
                      </span>
                      <p className="font-black text-emerald-600 text-sm">{formatCurrency(tenant.totalRevenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Plan Distribution + Recent Users */}
          <div className="space-y-6">
            {/* Plan distribution */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard size={18} className="text-indigo-500" />
                <p className="font-black text-slate-900">Distribusi Plan</p>
              </div>
              {loading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-8 rounded-xl bg-slate-100 animate-pulse" />)}</div>
              ) : (
                <div className="space-y-3">
                  {planDistribution.map(({ plan, count, total }) => (
                    <div key={plan}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest", planColor[plan])}>
                          {plan}
                        </span>
                        <span className="text-xs font-black text-slate-900">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={clsx(
                            "h-full rounded-full transition-all duration-700",
                            plan === "free" ? "bg-slate-400" :
                            plan === "pro" ? "bg-indigo-500" :
                            "bg-amber-500"
                          )}
                          style={{ width: total > 0 ? `${(count / total) * 100}%` : "0%" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Users */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-amber-500" />
                  <p className="font-black text-slate-900">User Terbaru</p>
                </div>
                <Link href="/admin/users" className="text-xs font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1 transition">
                  Lihat <ChevronRight size={12} />
                </Link>
              </div>
              {loading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />)}</div>
              ) : recentUsers.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Belum ada user.</p>
              ) : (
                <div className="space-y-2">
                  {recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-2.5 rounded-xl hover:bg-slate-50 p-1.5 transition">
                      <div className="size-7 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xs font-black text-slate-600 flex-shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-xs truncate">{user.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 flex-shrink-0">
                        {user.tenantCount} toko
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { href: "/admin/tenants", label: "Kelola Tenants", desc: "Lihat dan edit semua toko", icon: Building2, color: "from-teal-500 to-emerald-500" },
            { href: "/admin/users", label: "Kelola Users", desc: "Detail user dan privilege", icon: UsersRound, color: "from-indigo-500 to-purple-500" },
            { href: "/admin/plans", label: "Kelola Plans", desc: "Harga dan fitur paket", icon: CreditCard, color: "from-amber-500 to-orange-500" },
            { href: "/admin/payments", label: "Pembayaran", desc: "Monitor & aktivasi subscription", icon: Wallet, color: "from-rose-500 to-pink-500" },
          ].map(({ href, label, desc, icon: Icon, color }) => (
            <Link key={href} href={href}
              className="flex items-center gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition group">
              <div className={clsx("size-12 rounded-2xl bg-gradient-to-br flex items-center justify-center flex-shrink-0", color)}>
                <Icon size={22} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-black text-slate-900">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition" />
            </Link>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  gradient,
  href,
  pulse,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  gradient: string;
  href?: string;
  pulse?: boolean;
}) {
  const inner = (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition hover:-translate-y-0.5 group">
      <div className="flex items-start justify-between">
        <div className={clsx("size-11 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white", gradient)}>
          {icon}
        </div>
        <div className="flex items-center gap-1.5">
          {pulse && <span className="size-2 rounded-full bg-rose-500 animate-pulse" />}
          {href && <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition" />}
        </div>
      </div>
      <p className="mt-4 text-3xl font-black tracking-tight text-slate-950 truncate">{value}</p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-[10px] font-semibold text-slate-400">{sub}</p>
      </div>
    </div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}
