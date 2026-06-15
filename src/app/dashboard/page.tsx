"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { getDashboardStats } from "@/services/dashboard-service";
import type { DashboardStats } from "@/types/pos";
import {
  Banknote,
  PackageX,
  Receipt,
  TrendingUp,
} from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error("Gagal memuat stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    
    // Polling setiap 30 detik
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !stats) {
    return (
      <AppShell allowedRoles={["owner", "admin"]}>
        <div className="p-6">
          <p className="font-semibold text-slate-500">Memuat dashboard...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell allowedRoles={["owner", "admin"]}>
      <div className="p-4 lg:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Dashboard
          </h1>
          <p className="mt-1 text-slate-500">
            Ringkasan performa penjualan hari ini
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Omset Hari Ini"
            value={formatCurrency(stats.todayRevenue)}
            icon={<Banknote size={20} className="text-emerald-500" />}
          />
          <StatCard
            title="Transaksi"
            value={stats.todayTransactions}
            icon={<Receipt size={20} className="text-blue-500" />}
          />
          <StatCard
            title="Rata-rata Transaksi"
            value={formatCurrency(stats.averageTransaction)}
            icon={<TrendingUp size={20} className="text-cyan-500" />}
          />
          <StatCard
            title="Stok Menipis"
            value={stats.lowStockCount}
            icon={<PackageX size={20} className="text-rose-500" />}
          />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-bold">Produk Terlaris</h2>
            <div className="space-y-4">
              {stats.topProducts.map((product) => (
                <div key={product.name} className="flex items-center justify-between">
                  <p className="font-semibold">{product.name}</p>
                  <div className="text-right">
                    <p className="font-black text-cyan-600">{product.qty} terjual</p>
                    <p className="text-sm font-semibold text-slate-400">
                      {formatCurrency(product.revenue)}
                    </p>
                  </div>
                </div>
              ))}
              {stats.topProducts.length === 0 && (
                <p className="text-sm font-semibold text-slate-400">
                  Belum ada data penjualan
                </p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-bold">Transaksi Terakhir</h2>
            <div className="space-y-4">
              {stats.recentTransactions.map((trx) => (
                <div key={trx.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{trx.invoiceCode}</p>
                    <p className="text-sm font-semibold text-slate-400">
                      {trx.userName} • {trx.paymentMethod}
                    </p>
                  </div>
                  <p className="font-black text-slate-950">
                    {formatCurrency(trx.totalPrice)}
                  </p>
                </div>
              ))}
              {stats.recentTransactions.length === 0 && (
                <p className="text-sm font-semibold text-slate-400">
                  Belum ada transaksi
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
