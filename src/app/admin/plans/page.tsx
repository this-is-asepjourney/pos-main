"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminShell } from "@/components/admin-shell";
import { getAdminPlans, deleteAdminPlan, updateAdminPlan, createAdminPlan } from "@/services/admin-service";
import type { AdminPlan } from "@/types/pos";
import { formatCurrency } from "@/lib/format";
import {
  Check,
  CheckCircle2,
  CreditCard,
  GitBranch,
  Loader2,
  Package,
  PencilLine,
  Plus,
  Receipt,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
  Zap,
  BarChart3,
  FileSpreadsheet,
  Code2,
  Gift,
} from "lucide-react";
import { clsx } from "clsx";

// Plan visual config
const planMeta: Record<string, { gradient: string; badge: string; badgeText: string; icon: React.ElementType }> = {
  free:             { gradient: "from-slate-100 to-slate-200",     badge: "bg-slate-100 text-slate-600",    badgeText: "",            icon: Zap },
  starter:          { gradient: "from-cyan-50 to-sky-100",         badge: "bg-cyan-100 text-cyan-700",      badgeText: "Populer",     icon: Sparkles },
  pro:              { gradient: "from-indigo-50 to-purple-100",    badge: "bg-indigo-100 text-indigo-700",  badgeText: "Terlaris",    icon: ShieldCheck },
  "pro-yearly":     { gradient: "from-indigo-100 to-purple-200",   badge: "bg-indigo-200 text-indigo-800",  badgeText: "Hemat 17%",   icon: ShieldCheck },
  business:         { gradient: "from-amber-50 to-orange-100",     badge: "bg-amber-100 text-amber-700",    badgeText: "Enterprise",  icon: CreditCard },
  "business-yearly":{ gradient: "from-amber-100 to-orange-200",    badge: "bg-amber-200 text-amber-800",    badgeText: "Hemat 17%",   icon: CreditCard },
};

const featureDefs = [
  { key: "featureMultiBranch",     label: "Multi Cabang",       icon: GitBranch },
  { key: "featureAdvancedReports", label: "Laporan Lanjutan",   icon: BarChart3 },
  { key: "featureExcelExport",     label: "Export Excel",       icon: FileSpreadsheet },
  { key: "featureApiAccess",       label: "API Access",         icon: Code2 },
  { key: "featureLoyalty",         label: "Program Loyalitas",  icon: Gift },
] as const;

// ─── Plan Card ─────────────────────────────────────────────────────────────
function PlanCard({
  plan,
  onEdit,
  onDelete,
}: {
  plan: AdminPlan;
  onEdit: (p: AdminPlan) => void;
  onDelete: (id: string) => void;
}) {
  const meta = planMeta[plan.id] ?? {
    gradient: "from-slate-50 to-slate-100",
    badge: "bg-slate-100 text-slate-600",
    badgeText: "",
    icon: CreditCard,
  };
  const Icon = meta.icon;
  const isYearly = plan.billingInterval === "yearly";

  return (
    <div className={clsx(
      "relative rounded-3xl bg-gradient-to-br border border-slate-200 overflow-hidden flex flex-col shadow-sm hover:shadow-lg transition-shadow duration-200",
      meta.gradient
    )}>
      {/* Badge */}
      {meta.badgeText && (
        <div className="absolute top-4 right-4">
          <span className={clsx("rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest", meta.badge)}>
            {meta.badgeText}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="px-6 pt-6 pb-5 border-b border-white/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-2xl bg-white/70 flex items-center justify-center shadow-sm">
            <Icon size={20} className="text-slate-700" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">{plan.name}</h2>
            <p className="text-[10px] font-mono text-slate-500">{plan.id}</p>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1">
          {plan.priceIdr === 0 ? (
            <span className="text-3xl font-black text-slate-900">Gratis</span>
          ) : (
            <>
              <span className="text-3xl font-black text-slate-900">{formatCurrency(plan.priceIdr)}</span>
              <span className="text-sm text-slate-500 font-medium">/{isYearly ? "tahun" : "bulan"}</span>
            </>
          )}
        </div>
        {isYearly && plan.priceIdr > 0 && (
          <p className="text-xs text-slate-500 mt-0.5">
            ≈ {formatCurrency(Math.round(plan.priceIdr / 12))}/bulan
          </p>
        )}
      </div>

      {/* Limits */}
      <div className="px-6 py-4 border-b border-white/50 grid grid-cols-2 gap-3">
        {[
          { icon: GitBranch, label: "Cabang",  value: plan.maxBranches },
          { icon: Users,     label: "User",    value: plan.maxUsers },
          { icon: Package,   label: "Produk",  value: plan.maxProducts.toLocaleString("id") },
          { icon: Receipt,   label: "Tx/bulan", value: plan.transactionsPerMonth >= 100000 ? "∞" : plan.transactionsPerMonth.toLocaleString("id") },
        ].map(({ icon: LIcon, label, value }) => (
          <div key={label} className="flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2">
            <LIcon size={13} className="text-slate-500 flex-shrink-0" />
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
              <p className="text-sm font-black text-slate-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="px-6 py-4 flex-1">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Fitur</p>
        <ul className="space-y-1.5">
          {featureDefs.map(({ key, label, icon: FIcon }) => {
            const enabled = Boolean(plan[key as keyof AdminPlan]);
            return (
              <li key={key} className={clsx("flex items-center gap-2 text-xs font-semibold", enabled ? "text-slate-800" : "text-slate-400")}>
                <div className={clsx("size-4 rounded-full flex items-center justify-center flex-shrink-0",
                  enabled ? "bg-emerald-100" : "bg-slate-100")}>
                  {enabled
                    ? <Check size={9} className="text-emerald-600" />
                    : <X size={9} className="text-slate-400" />}
                </div>
                <FIcon size={11} className={enabled ? "text-slate-600" : "text-slate-300"} />
                {label}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Status + Actions */}
      <div className="px-6 py-4 border-t border-white/50 flex items-center justify-between gap-2">
        <span className={clsx(
          "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest",
          plan.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
        )}>
          {plan.isActive ? "Aktif" : "Nonaktif"}
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={() => onEdit(plan)}
            className="flex items-center gap-1.5 rounded-xl bg-white/80 border border-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-white shadow-sm transition"
          >
            <PencilLine size={12} /> Edit
          </button>
          <button
            onClick={() => onDelete(plan.id)}
            className="rounded-xl bg-rose-50 border border-rose-100 p-1.5 text-rose-500 hover:bg-rose-100 transition"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Plan Editor Modal ────────────────────────────────────────────────────────
function PlanEditorModal({
  plan,
  isNew,
  onSave,
  onClose,
}: {
  plan: Partial<AdminPlan>;
  isNew: boolean;
  onSave: (form: Partial<AdminPlan>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<AdminPlan>>(plan);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(form);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">{label}</label>
      {children}
    </div>
  );

  const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 bg-white";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <CreditCard size={16} className="text-white" />
            </div>
            <h2 className="font-black text-slate-900">{isNew ? "Buat Plan Baru" : `Edit Plan: ${plan.name}`}</h2>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 hover:bg-slate-100 text-slate-500">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* ID & Name */}
          <div className="grid grid-cols-2 gap-3">
            {isNew && (
              <Field label="ID (Slug)">
                <input required value={form.id ?? ""} onChange={e => setForm({ ...form, id: e.target.value })}
                  placeholder="e.g. pro-monthly" className={inputCls} />
              </Field>
            )}
            <Field label={isNew ? "Nama Plan" : "Nama Plan"}>
              <input required value={form.name ?? ""} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Pro" className={clsx(inputCls, "font-bold", !isNew && "col-span-2")} />
            </Field>
          </div>

          {/* Price & Interval */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Harga (IDR)">
              <input type="number" min="0" value={form.priceIdr ?? 0}
                onChange={e => setForm({ ...form, priceIdr: Number(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Periode">
              <select value={form.billingInterval ?? "monthly"}
                onChange={e => setForm({ ...form, billingInterval: e.target.value as any })} className={inputCls}>
                <option value="monthly">Bulanan</option>
                <option value="yearly">Tahunan</option>
              </select>
            </Field>
          </div>

          {/* Limits */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Batas Penggunaan</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Max Cabang">
                <input type="number" min="1" value={form.maxBranches ?? 1}
                  onChange={e => setForm({ ...form, maxBranches: Number(e.target.value) })} className={inputCls} />
              </Field>
              <Field label="Max Users">
                <input type="number" min="1" value={form.maxUsers ?? 1}
                  onChange={e => setForm({ ...form, maxUsers: Number(e.target.value) })} className={inputCls} />
              </Field>
              <Field label="Max Produk">
                <input type="number" min="1" value={form.maxProducts ?? 100}
                  onChange={e => setForm({ ...form, maxProducts: Number(e.target.value) })} className={inputCls} />
              </Field>
              <Field label="Transaksi / Bulan">
                <input type="number" min="1" value={form.transactionsPerMonth ?? 1000}
                  onChange={e => setForm({ ...form, transactionsPerMonth: Number(e.target.value) })} className={inputCls} />
              </Field>
            </div>
          </div>

          {/* Features */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Fitur Premium</p>
            <div className="grid grid-cols-2 gap-2">
              {featureDefs.map(({ key, label, icon: FIcon }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer rounded-xl hover:bg-white px-2 py-1.5 transition">
                  <input type="checkbox"
                    checked={Boolean(form[key as keyof AdminPlan])}
                    onChange={e => setForm({ ...form, [key]: e.target.checked })}
                    className="w-4 h-4 rounded accent-indigo-600" />
                  <FIcon size={13} className="text-slate-500 flex-shrink-0" />
                  <span className="text-xs font-semibold text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Active */}
          <label className="flex items-center gap-3 cursor-pointer rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <input type="checkbox" checked={Boolean(form.isActive ?? true)}
              onChange={e => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4 rounded accent-emerald-600" />
            <div>
              <p className="text-sm font-bold text-slate-800">Plan Aktif</p>
              <p className="text-xs text-slate-400">Tenant dapat memilih plan ini saat berlangganan</p>
            </div>
          </label>

          {error && (
            <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-600 font-semibold">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              {isNew ? "Buat Plan" : "Simpan Perubahan"}
            </button>
            <button type="button" onClick={onClose}
              className="rounded-2xl bg-slate-100 px-6 text-sm font-bold text-slate-700 hover:bg-slate-200 transition">
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminPlansPage() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingPlan, setEditingPlan] = useState<{ plan: Partial<AdminPlan>; isNew: boolean } | null>(null);

  const fetchData = useCallback(async () => {
    setError("");
    try {
      const data = await getAdminPlans();
      setPlans(data);
    } catch (err: any) {
      setError(err.message ?? "Gagal memuat plans.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: string) => {
    const plan = plans.find(p => p.id === id);
    if (!confirm(`Hapus plan "${plan?.name ?? id}"?\n\nTenant yang menggunakan plan ini tidak akan terdampak secara langsung.`)) return;
    try {
      await deleteAdminPlan(id);
      fetchData();
    } catch (err: any) {
      alert(err.message ?? "Gagal menghapus plan");
    }
  };

  const handleSave = async (form: Partial<AdminPlan>) => {
    if (editingPlan?.isNew) {
      await createAdminPlan(form);
    } else {
      await updateAdminPlan(editingPlan!.plan.id!, form);
    }
    fetchData();
  };

  const monthly = plans.filter(p => p.billingInterval === "monthly");
  const yearly = plans.filter(p => p.billingInterval === "yearly");

  return (
    <AdminShell>
      <div className="p-6 xl:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Subscription Plans</h1>
            <p className="mt-1 text-sm text-slate-500">
              Kelola paket berlangganan — harga, batas, dan fitur yang tersedia untuk tenant.
            </p>
          </div>
          <button
            onClick={() => setEditingPlan({ isNew: true, plan: {
              id: "", name: "", priceIdr: 0, billingInterval: "monthly",
              maxBranches: 1, maxProducts: 100, maxUsers: 5, transactionsPerMonth: 1000,
              featureMultiBranch: false, featureAdvancedReports: false, featureExcelExport: false,
              featureApiAccess: false, featureLoyalty: false, isActive: true,
            }})}
            className="flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 transition shadow-lg shadow-slate-950/20"
          >
            <Plus size={16} /> Buat Plan
          </button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Plans",  value: plans.length,                             color: "text-slate-900" },
            { label: "Aktif",        value: plans.filter(p => p.isActive).length,      color: "text-emerald-600" },
            { label: "Bulanan",      value: monthly.length,                            color: "text-indigo-600" },
            { label: "Tahunan",      value: yearly.length,                             color: "text-amber-600" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{s.label}</p>
              <p className={clsx("text-2xl font-black mt-0.5", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-slate-300" />
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 text-rose-700 font-semibold text-sm">
            ⚠️ {error}
          </div>
        ) : (
          <>
            {/* Monthly plans */}
            {monthly.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">Paket Bulanan</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                  {monthly.map(plan => (
                    <PlanCard key={plan.id} plan={plan} onEdit={p => setEditingPlan({ plan: p, isNew: false })} onDelete={handleDelete} />
                  ))}
                </div>
              </section>
            )}

            {/* Yearly plans */}
            {yearly.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">Paket Tahunan</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">Hemat s/d 17%</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                  {yearly.map(plan => (
                    <PlanCard key={plan.id} plan={plan} onEdit={p => setEditingPlan({ plan: p, isNew: false })} onDelete={handleDelete} />
                  ))}
                </div>
              </section>
            )}

            {plans.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-16 text-center">
                <CreditCard size={40} className="mx-auto text-slate-200 mb-4" />
                <p className="font-black text-slate-900 text-lg">Belum ada plan</p>
                <p className="text-sm text-slate-400 mt-1">Klik "Buat Plan" untuk menambah paket berlangganan.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Editor Modal */}
      {editingPlan && (
        <PlanEditorModal
          plan={editingPlan.plan}
          isNew={editingPlan.isNew}
          onSave={handleSave}
          onClose={() => setEditingPlan(null)}
        />
      )}
    </AdminShell>
  );
}
