"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PackageOpen, ReceiptText, TrendingUp, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { formatCurrency, formatDateTime, formatShortDate } from "@/lib/format";
import { getDashboardStats } from "@/services/dashboard-service";
import type { DashboardStats } from "@/types/pos";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
    getDashboardStats().then(setStats);
  }, []);

  const revenueData =
    stats?.recentTransactions
      .slice()
      .reverse()
      .map((transaction) => ({
        name: formatShortDate(transaction.createdAt),
        revenue: transaction.totalPrice,
      })) ?? [];

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6 p-4 lg:p-6">
        <header className="rounded-[2rem] bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-700">Dashboard</p>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-slate-950">Ringkasan bisnis hari ini</h1>
              <p className="mt-2 max-w-2xl text-slate-500">
                Pantau omzet, transaksi, produk terlaris, dan stok yang perlu segera diisi ulang.
              </p>
            </div>
            <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">
              Realtime-ready
            </span>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Omzet"
            value={formatCurrency(stats?.todayRevenue ?? 0)}
            helper="Akumulasi transaksi hari ini"
            icon={TrendingUp}
          />
          <StatCard
            label="Transaksi"
            value={`${stats?.todayTransactions ?? 0}`}
            helper="Jumlah invoice hari ini"
            icon={ReceiptText}
          />
          <StatCard
            label="Rata-rata"
            value={formatCurrency(stats?.averageTransaction ?? 0)}
            helper="Nilai per transaksi"
            icon={WalletCards}
          />
          <StatCard
            label="Stok rendah"
            value={`${stats?.lowStockCount ?? 0}`}
            helper="Produk perlu restock"
            icon={PackageOpen}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-black text-slate-950">Grafik omzet terbaru</h2>
              <p className="text-sm text-slate-500">Berdasarkan transaksi terakhir yang tersimpan.</p>
            </div>
            <div className="h-80">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="revenue" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Area type="monotone" dataKey="revenue" stroke="#0891b2" fill="url(#revenue)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full rounded-3xl bg-slate-50" />
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-black text-slate-950">Produk terlaris</h2>
              <p className="text-sm text-slate-500">Urutan berdasarkan jumlah item terjual.</p>
            </div>
            <div className="h-80">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.topProducts ?? []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={110} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => `${value} item`} />
                    <Bar dataKey="qty" fill="#0f172a" radius={[0, 10, 10, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full rounded-3xl bg-slate-50" />
              )}
            </div>
          </section>
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Transaksi terbaru</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="py-3">Invoice</th>
                  <th>Kasir</th>
                  <th>Waktu</th>
                  <th>Metode</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(stats?.recentTransactions ?? []).map((transaction) => (
                  <tr key={transaction.id} className="font-semibold text-slate-700">
                    <td className="py-4 text-slate-950">{transaction.invoiceCode}</td>
                    <td>{transaction.userName}</td>
                    <td>{formatDateTime(transaction.createdAt)}</td>
                    <td className="uppercase">{transaction.paymentMethod}</td>
                    <td className="text-right font-black text-slate-950">{formatCurrency(transaction.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
