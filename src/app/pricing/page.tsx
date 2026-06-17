import Link from "next/link";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import { formatCurrency } from "@/lib/format";
import {
  ArrowLeft,
  Check,
  Code2,
  FileSpreadsheet,
  Gift,
  GitBranch,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  X,
  Zap,
  Package,
  Receipt,
  Building2
} from "lucide-react";
import { clsx } from "clsx";
import { BrandMark } from "@/components/brand-mark";

// Server Component (can fetch DB directly)
export const revalidate = 60; // Cache valid for 60 seconds

export default async function PricingPage() {
  let plans: any[] = [];
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, price_idr as priceIdr, billing_interval as billingInterval,
              max_branches as maxBranches, max_products as maxProducts, max_users as maxUsers,
              transactions_per_month as transactionsPerMonth,
              feature_multi_branch as featureMultiBranch,
              feature_advanced_reports as featureAdvancedReports,
              feature_excel_export as featureExcelExport,
              feature_api_access as featureApiAccess,
              feature_loyalty as featureLoyalty
       FROM plans WHERE is_active = 1 ORDER BY price_idr ASC`
    );
    plans = rows;
  } catch (e) {
    console.error("Gagal load pricing:", e);
  }

  // Filter plans to show only monthly by default to keep public view simpler, 
  // or show all. We can group them by monthly vs yearly.
  const monthlyPlans = plans.filter(p => p.billingInterval === "monthly");
  const yearlyPlans = plans.filter(p => p.billingInterval === "yearly");
  
  // We will display just monthly on public view for simplicity, with a note about yearly discounts.
  // Or display whatever plans are available if monthly is empty.
  const displayPlans = monthlyPlans.length > 0 ? monthlyPlans : plans;

  const planMeta: Record<string, { gradient: string; icon: any; accent: string; badgeText?: string; recommended?: boolean }> = {
    free:     { gradient: "from-slate-100 to-slate-50",        icon: Zap,        accent: "bg-slate-900 text-white" },
    starter:  { gradient: "from-sky-50 to-cyan-50",            icon: Sparkles,   accent: "bg-cyan-600 text-white",   badgeText: "Populer" },
    pro:      { gradient: "from-indigo-50 to-violet-50",       icon: ShieldCheck, accent: "bg-indigo-600 text-white", badgeText: "Terlaris", recommended: true },
    business: { gradient: "from-amber-50 to-orange-50",        icon: Star,       accent: "bg-amber-600 text-white",  badgeText: "Enterprise" },
  };

  const featureDefs = [
    { key: "featureMultiBranch",     label: "Multi Cabang",      icon: GitBranch },
    { key: "featureExcelExport",     label: "Export Excel",      icon: FileSpreadsheet },
    { key: "featureApiAccess",       label: "API Access",        icon: Code2 },
    { key: "featureLoyalty",         label: "Program Loyalitas", icon: Gift },
  ] as const;

  return (
    <main className="min-h-screen bg-slate-50 selection:bg-indigo-200 selection:text-indigo-900">
      {/* Header */}
      <nav className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-bold text-slate-600 hover:text-slate-900 transition"
            >
              Masuk
            </Link>
            <Link
              href="/onboarding"
              className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-cyan-600 shadow-lg shadow-slate-900/20"
            >
              Buat Toko Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-6 py-20 text-center text-white">
        <div className="mx-auto max-w-4xl">
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-3xl bg-indigo-500/20 shadow-inner">
            <ShieldCheck size={32} className="text-indigo-300" />
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl mb-6">
            Pilih Paket, Skalakan Bisnis Anda.
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-300 sm:text-xl">
            Solusi Kasir (POS) paling handal dengan sinkronisasi real-time. Tidak ada komitmen jangka panjang, upgrade atau downgrade kapan saja.
          </p>
        </div>
      </div>

      {/* Pricing Grid */}
      <div className="mx-auto max-w-6xl px-6 py-16 -mt-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {displayPlans.length === 0 && (
            <div className="col-span-4 text-center py-20 text-slate-500">
              Menyiapkan paket berlangganan...
            </div>
          )}
          {displayPlans.map(plan => {
            const meta = planMeta[plan.id.split('-')[0]] ?? { gradient: "from-slate-50 to-slate-100", icon: Building2, accent: "bg-slate-900 text-white" };
            const Icon = meta.icon;

            return (
              <div
                key={plan.id}
                className={clsx(
                  "relative flex flex-col rounded-[2.5rem] border-2 bg-gradient-to-br p-1 shadow-sm transition hover:shadow-xl",
                  meta.recommended
                    ? "border-indigo-500 shadow-indigo-500/20 hover:-translate-y-2"
                    : "border-slate-200 hover:-translate-y-1 hover:border-slate-300",
                  meta.gradient
                )}
              >
                {meta.badgeText && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={clsx("whitespace-nowrap rounded-full px-4 py-1 text-xs font-black uppercase tracking-widest shadow-md", meta.accent)}>
                      {meta.badgeText}
                    </span>
                  </div>
                )}

                <div className="flex-1 rounded-[2.2rem] bg-white/60 p-6 backdrop-blur-md">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                      <Icon size={24} className="text-slate-700" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">{plan.name}</h3>
                    </div>
                  </div>

                  <div className="mb-6">
                    {plan.priceIdr === 0 ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black tracking-tight text-slate-900">Gratis</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black tracking-tight text-slate-900">{formatCurrency(plan.priceIdr)}</span>
                        <span className="text-sm font-semibold text-slate-500">/bln</span>
                      </div>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="mb-6 space-y-3">
                    <div className="flex items-center justify-between rounded-xl bg-white/80 px-4 py-2.5 text-sm font-bold shadow-sm">
                      <span className="text-slate-500">Cabang</span>
                      <span className="text-slate-900">{plan.maxBranches}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/80 px-4 py-2.5 text-sm font-bold shadow-sm">
                      <span className="text-slate-500">User / Kasir</span>
                      <span className="text-slate-900">{plan.maxUsers}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/80 px-4 py-2.5 text-sm font-bold shadow-sm">
                      <span className="text-slate-500">Limit Produk</span>
                      <span className="text-slate-900">{plan.maxProducts.toLocaleString('id')}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/80 px-4 py-2.5 text-sm font-bold shadow-sm">
                      <span className="text-slate-500">Tx / Bulan</span>
                      <span className="text-slate-900">{plan.transactionsPerMonth >= 100000 ? "Unlimited" : plan.transactionsPerMonth.toLocaleString('id')}</span>
                    </div>
                  </div>

                  <hr className="my-6 border-slate-200" />

                  {/* Features */}
                  <ul className="mb-8 space-y-4">
                    {featureDefs.map(({ key, label, icon: FIcon }) => {
                      const enabled = Boolean(plan[key]);
                      return (
                        <li key={key} className={clsx(
                          "flex items-center gap-3 text-sm font-semibold",
                          enabled ? "text-slate-800" : "text-slate-400 line-through"
                        )}>
                          <div className={clsx("flex size-5 shrink-0 items-center justify-center rounded-full",
                            enabled ? "bg-emerald-100" : "bg-slate-100")}>
                            {enabled ? <Check size={12} className="text-emerald-600" /> : <X size={12} className="text-slate-300" />}
                          </div>
                          {label}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="p-3">
                  <Link
                    href="/onboarding"
                    className={clsx(
                      "flex w-full items-center justify-center rounded-2xl px-6 py-4 text-sm font-black transition",
                      meta.recommended
                        ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/30"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    )}
                  >
                    Daftar {plan.name}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {yearlyPlans.length > 0 && (
          <div className="mt-12 text-center">
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 border border-emerald-200">
              <Sparkles size={16} />
              Tersedia juga opsi Berlangganan Tahunan dengan diskon khusus! (Lihat di dashboard Admin)
            </p>
          </div>
        )}
      </div>

      {/* Footer minimalis */}
      <footer className="border-t border-slate-200 bg-white py-10 text-center">
        <BrandMark />
        <p className="mt-4 text-sm text-slate-500">
          © {new Date().getFullYear()} Bro-POS System. All rights reserved.
        </p>
        <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700">
          <ArrowLeft size={16} /> Kembali ke halaman Login
        </Link>
      </footer>
    </main>
  );
}
