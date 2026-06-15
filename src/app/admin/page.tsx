"use client";

import { useEffect, useState } from "react";
import { Building2, ReceiptText, ShieldCheck, UsersRound } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { getAdminStats } from "@/services/admin-service";
import type { AdminStats } from "@/types/pos";
import { formatCurrency } from "@/lib/format";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getAdminStats();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch admin stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <AdminShell>
      <div className="p-6 xl:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900">System Overview</h1>
          <p className="mt-1 text-sm text-slate-500">Statistik global penggunaan Bro-POS.</p>
        </div>

        {loading ? (
          <div className="text-sm font-semibold text-slate-500 animate-pulse">Loading stats...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              title="Total Tenants"
              value={stats?.totalTenants ?? 0}
              icon={<Building2 size={24} className="text-cyan-600" />}
            />
            <StatCard
              title="Total Users"
              value={stats?.totalUsers ?? 0}
              icon={<UsersRound size={24} className="text-indigo-600" />}
            />
            <StatCard
              title="Total Revenue"
              value={formatCurrency(stats?.totalRevenue ?? 0)}
              icon={<ReceiptText size={24} className="text-emerald-600" />}
            />
            <StatCard
              title="Active Subs"
              value={stats?.activeSubscriptions ?? 0}
              icon={<ShieldCheck size={24} className="text-amber-600" />}
            />
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          {title}
        </span>
        <span className="flex size-12 items-center justify-center rounded-2xl bg-slate-50">
          {icon}
        </span>
      </div>
      <p className="mt-5 text-3xl font-black tracking-tight text-slate-950">{value}</p>
    </div>
  );
}
