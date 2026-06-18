"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/app-provider";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  FileSpreadsheet,
  Gift,
  GitBranch,
  Code2,
  Loader2,
  Package,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
  Star,
  Send,
  Hourglass,
} from "lucide-react";
import { clsx } from "clsx";

// ─── Types ────────────────────────────────────────────────────────────────────
type Plan = {
  id: string;
  name: string;
  priceIdr: number;
  billingInterval: "monthly" | "yearly";
  maxBranches: number;
  maxProducts: number;
  maxUsers: number;
  transactionsPerMonth: number;
  featureMultiBranch: boolean;
  featureAdvancedReports: boolean;
  featureExcelExport: boolean;
  featureApiAccess: boolean;
  featureLoyalty: boolean;
};

type Subscription = {
  planId: string;
  status: string;
  trialEndsAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  lastPaymentAt: string | null;
  paymentMethod: string | null;
  tenantName: string;
  tenantPlan: string;
  memberCount: number;
  productCount: number;
  txThisMonth: number;
};

type PendingRequest = {
  id: string;
  requestedPlanName: string;
  requestedPlanId: string;
  paymentMethod: string;
  amountIdr: number;
  status: string;
  createdAt: string;
};

type PaymentMethodItem = {
  id: number;
  name: string;
  type: string;
  accountNumber: string | null;
  accountName: string | null;
  qrImageUrl: string | null;
};

// ─── Plan visual config ───────────────────────────────────────────────────────
const planMeta: Record<string, {
  gradient: string; icon: React.ElementType; accent: string; badgeText?: string; recommended?: boolean
}> = {
  free:              { gradient: "from-slate-100 to-slate-50",        icon: Zap,        accent: "bg-slate-900 text-white" },
  starter:           { gradient: "from-sky-50 to-cyan-50",            icon: Sparkles,   accent: "bg-cyan-600 text-white",   badgeText: "Populer" },
  pro:               { gradient: "from-indigo-50 to-violet-50",       icon: ShieldCheck, accent: "bg-indigo-600 text-white", badgeText: "Terlaris", recommended: true },
  "pro-yearly":      { gradient: "from-indigo-100 to-violet-100",     icon: ShieldCheck, accent: "bg-indigo-700 text-white", badgeText: "Hemat 17%" },
  business:          { gradient: "from-amber-50 to-orange-50",        icon: Star,       accent: "bg-amber-600 text-white",  badgeText: "Enterprise" },
  "business-yearly": { gradient: "from-amber-100 to-orange-100",      icon: Star,       accent: "bg-amber-700 text-white",  badgeText: "Hemat 17%" },
};

const featureDefs = [
  { key: "featureMultiBranch",     label: "Multi Cabang",      icon: GitBranch },
  { key: "featureAdvancedReports", label: "Laporan Lanjutan",  icon: BarChart3 },
  { key: "featureExcelExport",     label: "Export Excel",      icon: FileSpreadsheet },
  { key: "featureApiAccess",       label: "API Access",        icon: Code2 },
  { key: "featureLoyalty",         label: "Program Loyalitas", icon: Gift },
] as const;

const statusColors: Record<string, string> = {
  active:           "bg-emerald-100 text-emerald-700",
  trial:            "bg-cyan-100 text-cyan-700",
  past_due:         "bg-orange-100 text-orange-700",
  cancelled:        "bg-slate-100 text-slate-500",
  pending_approval: "bg-amber-100 text-amber-700",
};

const methodLabels: Record<string, string> = {
  transfer: "🏦 Transfer Bank",
  qris:     "📱 QRIS",
  manual:   "📞 Manual",
};

// ─── Payment Modal ────────────────────────────────────────────────────────────
function PaymentModal({
  plan,
  currentPlanId,
  availableMethods,
  onConfirm,
  onClose,
}: {
  plan: Plan;
  currentPlanId: string;
  availableMethods: PaymentMethodItem[];
  onConfirm: (planId: string, method: string, proofNote: string) => Promise<{ requiresApproval: boolean }>;
  onClose: () => void;
}) {
  const [methodId, setMethodId] = useState<number>(availableMethods.length > 0 ? availableMethods[0].id : 0);
  const [proofNote, setProofNote] = useState("");
  const [step, setStep] = useState<"choose" | "confirm" | "processing" | "done" | "pending">("choose");
  const [error, setError] = useState("");
  const isFree = plan.priceIdr === 0;

  const handlePay = async () => {
    setStep("processing");
    setError("");
    try {
      const selectedMethod = availableMethods.find(m => m.id === methodId);
      const methodLabel = selectedMethod ? selectedMethod.name : "manual";
      const result = await onConfirm(plan.id, isFree ? "free" : methodLabel, proofNote);
      if (result.requiresApproval) {
        setStep("pending");
      } else {
        setStep("done");
      }
    } catch (e: any) {
      setError(e.message);
      setStep("confirm");
    }
  };

  const getMethodIcon = (type: string) => {
    if (type === "bank_transfer") return "🏦";
    if (type === "qris") return "📱";
    return "💳";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={step !== "processing" ? onClose : undefined} />

      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <CreditCard size={20} className="text-white" />
              </div>
              <div>
                <p className="font-black text-lg">{isFree ? "Ganti ke Free" : `Upgrade ke ${plan.name}`}</p>
                <p className="text-indigo-200 text-xs">{isFree ? "Downgrade plan" : "Ajukan berlangganan"}</p>
              </div>
            </div>
            {step !== "processing" && (
              <button onClick={onClose} className="rounded-xl p-1.5 hover:bg-white/20 transition">
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="px-6 py-5">
          {/* Done State (instant — free plan) */}
          {step === "done" && (
            <div className="text-center py-6">
              <div className="size-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Berhasil!</h3>
              <p className="text-sm text-slate-600 mb-6">
                Plan Anda telah diturunkan ke Free.
              </p>
              <button onClick={onClose}
                className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition">
                Tutup
              </button>
            </div>
          )}

          {/* Pending Approval State */}
          {step === "pending" && (
            <div className="text-center py-6">
              <div className="size-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <Hourglass size={32} className="text-amber-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Permintaan Terkirim!</h3>
              <p className="text-sm text-slate-600 mb-2">
                Permintaan upgrade ke <strong>{plan.name}</strong> telah dikirim.
              </p>
              <p className="text-sm text-slate-500 mb-6">
                Admin akan meninjau dan mengkonfirmasi pembayaran Anda. Anda akan mendapat notifikasi saat plan diaktifkan.
              </p>
              <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 mb-5 flex gap-2 items-start">
                <Clock size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 font-medium text-left">
                  Proses verifikasi biasanya memakan waktu 1x24 jam kerja. Jika ada pertanyaan, hubungi admin.
                </p>
              </div>
              <button onClick={onClose}
                className="w-full rounded-2xl bg-amber-600 py-3 text-sm font-bold text-white hover:bg-amber-700 transition">
                Mengerti
              </button>
            </div>
          )}

          {/* Processing */}
          {step === "processing" && (
            <div className="text-center py-10">
              <Loader2 size={40} className="animate-spin text-indigo-500 mx-auto mb-4" />
              <p className="font-bold text-slate-700">Mengirim permintaan…</p>
              <p className="text-xs text-slate-400 mt-1">Mohon tunggu sebentar</p>
            </div>
          )}

          {/* Choose payment method */}
          {step === "choose" && !isFree && (
            <>
              {/* Plan summary */}
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 mb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-slate-900">{plan.name}</p>
                    <p className="text-xs text-slate-500">{plan.billingInterval === "yearly" ? "Tahunan" : "Bulanan"}</p>
                  </div>
                  <p className="text-2xl font-black text-indigo-600">{formatCurrency(plan.priceIdr)}</p>
                </div>
              </div>

              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Metode Pembayaran</p>
              <div className="space-y-2 mb-5">
                {availableMethods.length === 0 && (
                  <p className="text-sm text-slate-500">Tidak ada metode pembayaran yang tersedia.</p>
                )}
                {availableMethods.map((m) => (
                  <button key={m.id} type="button" onClick={() => setMethodId(m.id)}
                    className={clsx(
                      "w-full flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition",
                      methodId === m.id ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
                    )}>
                    <span className="text-2xl">{getMethodIcon(m.type)}</span>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 text-sm">{m.name}</p>
                      <p className="text-xs text-slate-500">
                        {m.type === "bank_transfer" ? "Transfer Bank" : "QRIS"}
                      </p>
                    </div>
                    <div className={clsx("size-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                      methodId === m.id ? "border-indigo-500 bg-indigo-500" : "border-slate-300")}>
                      {methodId === m.id && <div className="size-2 rounded-full bg-white" />}
                    </div>
                  </button>
                ))}
              </div>

              {/* Detail of selected method */}
              {availableMethods.find(m => m.id === methodId) && (
                <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 mb-5 space-y-3">
                  <div className="flex gap-2 items-start">
                    <AlertTriangle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 font-medium">
                      Pilih metode pembayaran di atas. Harap transfer / scan sesuai dengan detail berikut:
                    </p>
                  </div>
                  {availableMethods.find(m => m.id === methodId)?.type === "bank_transfer" ? (
                    <div className="bg-white rounded-xl p-3 border border-blue-100">
                      <p className="text-xs text-slate-500 font-semibold mb-1">No. Rekening ({availableMethods.find(m => m.id === methodId)?.name})</p>
                      <p className="font-black text-slate-900 text-lg tracking-widest">{availableMethods.find(m => m.id === methodId)?.accountNumber}</p>
                      <p className="font-bold text-slate-700 mt-1">A/N: {availableMethods.find(m => m.id === methodId)?.accountName}</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl p-3 border border-blue-100 flex justify-center">
                      <img src={availableMethods.find(m => m.id === methodId)?.qrImageUrl ?? ""} alt="QRIS" className="w-48 h-48 object-contain rounded-xl" />
                    </div>
                  )}
                </div>
              )}

              {/* Payment proof note */}
              <div className="mb-5">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-2">
                  Catatan Pembayaran (opsional)
                </label>
                <textarea
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  placeholder="Contoh: Transfer dari BCA a/n Asep, Rp 99.000 pada 17 Jun 2026"
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none resize-none placeholder:text-slate-400"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Informasi ini akan dikirim ke admin untuk mempercepat proses verifikasi.
                </p>
              </div>

              <button onClick={() => setStep("confirm")}
                className="w-full rounded-2xl bg-indigo-600 py-3.5 text-sm font-black text-white hover:bg-indigo-700 transition flex items-center justify-center gap-2">
                Lanjut <ArrowRight size={16} />
              </button>
            </>
          )}

          {/* Free plan downgrade */}
          {step === "choose" && isFree && (
            <>
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 mb-5 flex gap-3">
                <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-800 text-sm">Konfirmasi Downgrade</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Anda akan beralih ke plan <strong>Free</strong>. Fitur premium tidak akan tersedia,
                    dan data yang melebihi batas akan tetap ada namun tidak dapat diakses.
                  </p>
                </div>
              </div>
              <button onClick={handlePay}
                className="w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-black text-white hover:bg-slate-700 transition">
                Ya, Pindah ke Free
              </button>
            </>
          )}

          {/* Confirm step */}
          {step === "confirm" && (
            <>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 mb-5 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Plan</span>
                  <span className="font-bold text-slate-900">{plan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Periode</span>
                  <span className="font-bold text-slate-900">{plan.billingInterval === "yearly" ? "1 Tahun" : "1 Bulan"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Metode</span>
                  <span className="font-bold text-slate-900">{availableMethods.find(m => m.id === methodId)?.name}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between">
                  <span className="font-black text-slate-900">Total</span>
                  <span className="font-black text-indigo-600 text-lg">{formatCurrency(plan.priceIdr)}</span>
                </div>
              </div>

              {/* Important notice */}
              <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 mb-5 flex gap-2">
                <Clock size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 font-medium">
                  Setelah mengirim permintaan, admin akan memverifikasi pembayaran dan mengaktifkan plan Anda.
                </p>
              </div>

              {error && (
                <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-2 mb-4 text-sm text-rose-700 font-semibold">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setStep("choose")}
                  className="flex-shrink-0 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition">
                  Kembali
                </button>
                <button onClick={handlePay}
                  className="flex-1 rounded-2xl bg-indigo-600 py-3 text-sm font-black text-white hover:bg-indigo-700 transition flex items-center justify-center gap-2">
                  <Send size={16} /> Kirim Permintaan
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────
function PlanCard({
  plan,
  isCurrent,
  onSelect,
  disabled,
  hasPending,
}: {
  plan: Plan;
  isCurrent: boolean;
  onSelect: (plan: Plan) => void;
  disabled: boolean;
  hasPending: boolean;
}) {
  const meta = planMeta[plan.id] ?? { gradient: "from-slate-50 to-slate-100", icon: CreditCard, accent: "bg-slate-900 text-white" };
  const Icon = meta.icon;

  return (
    <div className={clsx(
      "relative rounded-3xl border-2 overflow-hidden flex flex-col transition-all duration-200",
      isCurrent
        ? "border-emerald-400 shadow-lg shadow-emerald-500/20"
        : meta.recommended
          ? "border-indigo-400 shadow-lg shadow-indigo-500/15 hover:shadow-xl hover:-translate-y-1"
          : "border-slate-200 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5",
      `bg-gradient-to-br ${meta.gradient}`
    )}>
      {/* Current badge */}
      {isCurrent && (
        <div className="absolute top-0 left-0 right-0 bg-emerald-500 text-white text-center text-[10px] font-black uppercase tracking-widest py-1">
          ✓ Plan Aktif Saat Ini
        </div>
      )}
      {!isCurrent && meta.badgeText && (
        <div className="absolute top-4 right-4">
          <span className={clsx("rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest", meta.accent)}>
            {meta.badgeText}
          </span>
        </div>
      )}

      <div className={clsx("px-6 pb-5 flex-1", isCurrent ? "pt-10" : "pt-6")}>
        {/* Plan header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="size-11 rounded-2xl bg-white/80 shadow-sm flex items-center justify-center">
            <Icon size={22} className="text-slate-700" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">{plan.name}</h3>
            <p className="text-xs text-slate-500 font-mono">{plan.id}</p>
          </div>
        </div>

        {/* Price */}
        <div className="mb-6">
          {plan.priceIdr === 0 ? (
            <p className="text-4xl font-black text-slate-900">Gratis</p>
          ) : (
            <>
              <p className="text-4xl font-black text-slate-900">{formatCurrency(plan.priceIdr)}</p>
              <p className="text-sm text-slate-500 font-medium">/{plan.billingInterval === "yearly" ? "tahun" : "bulan"}</p>
              {plan.billingInterval === "yearly" && (
                <p className="text-xs text-emerald-600 font-bold mt-0.5">
                  ≈ {formatCurrency(Math.round(plan.priceIdr / 12))}/bulan
                </p>
              )}
            </>
          )}
        </div>

        {/* Limits */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          {[
            { icon: GitBranch, label: "Cabang",   value: plan.maxBranches },
            { icon: Users,     label: "User",     value: plan.maxUsers },
            { icon: Package,   label: "Produk",   value: plan.maxProducts.toLocaleString("id") },
            { icon: Receipt,   label: "Tx/bln",   value: plan.transactionsPerMonth >= 100000 ? "Unlimited" : plan.transactionsPerMonth.toLocaleString("id") },
          ].map(({ icon: LIcon, label, value }) => (
            <div key={label} className="flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2">
              <LIcon size={12} className="text-slate-500 flex-shrink-0" />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                <p className="text-xs font-black text-slate-900">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Features */}
        <ul className="space-y-2">
          {featureDefs.map(({ key, label, icon: FIcon }) => {
            const enabled = Boolean(plan[key as keyof Plan]);
            return (
              <li key={key} className={clsx(
                "flex items-center gap-2 text-xs font-semibold",
                enabled ? "text-slate-800" : "text-slate-400 line-through"
              )}>
                <div className={clsx("size-4 rounded-full flex items-center justify-center flex-shrink-0",
                  enabled ? "bg-emerald-100" : "bg-slate-100")}>
                  {enabled ? <Check size={9} className="text-emerald-600" /> : <X size={9} className="text-slate-300" />}
                </div>
                <FIcon size={11} />
                {label}
              </li>
            );
          })}
        </ul>
      </div>

      {/* CTA */}
      <div className="px-6 pb-6">
        {isCurrent ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-100 border border-emerald-200 py-3 text-sm font-black text-emerald-700">
            <CheckCircle2 size={16} /> Plan Aktif
          </div>
        ) : hasPending ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-amber-100 border border-amber-200 py-3 text-sm font-black text-amber-700">
            <Clock size={16} /> Menunggu Persetujuan
          </div>
        ) : (
          <button
            onClick={() => onSelect(plan)}
            disabled={disabled}
            className={clsx(
              "w-full rounded-2xl py-3.5 text-sm font-black transition flex items-center justify-center gap-2",
              meta.recommended
                ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/30"
                : "bg-slate-900 text-white hover:bg-slate-700",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {plan.priceIdr === 0 ? "Pindah ke Free" : `Pilih ${plan.name}`}
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SubscriptionPage() {
  const { tenantId, role } = useAuth();
  const [data, setData] = useState<{
    subscription: Subscription | null;
    plans: Plan[];
    recentActivity: any[];
    pendingRequest: PendingRequest | null;
    paymentMethods: PaymentMethodItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [tab, setTab] = useState<"monthly" | "yearly">("monthly");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/subscription");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpgrade = async (planId: string, method: string, proofNote: string): Promise<{ requiresApproval: boolean }> => {
    const res = await fetch("/api/subscription/upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, paymentMethod: method, paymentProofNote: proofNote }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Gagal memproses permintaan.");
    await load(); // Refresh data
    return { requiresApproval: json.requiresApproval ?? false };
  };

  const isOwner = role === "owner";
  const sub = data?.subscription;
  const allPlans = data?.plans ?? [];
  const filteredPlans = allPlans.filter(p => p.billingInterval === tab);
  const currentPlanId = sub?.planId ?? "free";
  const pendingRequest = data?.pendingRequest;
  const isPendingApproval = sub?.status === "pending_approval";

  return (
    <AppShell allowedRoles={["owner", "admin"]}>
      <div className="min-h-screen bg-slate-50">
        {/* Hero Header */}
        <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-6 py-10 text-white">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 text-indigo-300 text-sm font-semibold mb-3">
              <CreditCard size={16} />
              Subscription & Billing
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-2">
              Kelola Langganan Toko Anda
            </h1>
            <p className="text-slate-300 text-base max-w-xl">
              Pilih paket yang sesuai kebutuhan bisnis Anda. Upgrade kapanpun, menunggu konfirmasi admin.
            </p>

            {/* Current sub summary */}
            {!loading && sub && (
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Plan Aktif", value: sub.planId || "Free", icon: ShieldCheck },
                  { label: "Status", value: sub.status === "pending_approval" ? "Menunggu" : sub.status, icon: sub.status === "pending_approval" ? Clock : CheckCircle2 },
                  { label: "Member", value: sub.memberCount, icon: Users },
                  { label: "Tx Bulan Ini", value: sub.txThisMonth, icon: Receipt },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={14} className="text-indigo-300" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                    </div>
                    <p className="font-black text-white text-lg capitalize">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-indigo-400" />
            </div>
          )}

          {error && (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 flex gap-3">
              <AlertTriangle className="text-rose-500 flex-shrink-0" size={20} />
              <div>
                <p className="font-bold text-rose-700">Gagal memuat data</p>
                <p className="text-sm text-rose-600 mt-0.5">{error}</p>
                <button onClick={load} className="mt-3 flex items-center gap-1.5 text-sm font-bold text-rose-600 hover:text-rose-800 transition">
                  <RefreshCw size={14} /> Coba lagi
                </button>
              </div>
            </div>
          )}

          {!loading && data && (
            <>
              {/* Pending Approval Banner */}
              {(isPendingApproval || pendingRequest) && (
                <section className="rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="size-12 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Hourglass size={24} className="text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-amber-900 text-lg mb-1">Permintaan Upgrade Sedang Ditinjau</h3>
                      <p className="text-sm text-amber-800">
                        Permintaan upgrade ke <strong>{pendingRequest?.requestedPlanName ?? "plan baru"}</strong> sedang menunggu konfirmasi admin.
                        Plan akan diaktifkan setelah pembayaran diverifikasi.
                      </p>
                      {pendingRequest && (
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <div className="rounded-xl bg-white/70 px-3 py-2">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-amber-500">Plan Diminta</p>
                            <p className="text-sm font-black text-amber-900">{pendingRequest.requestedPlanName}</p>
                          </div>
                          <div className="rounded-xl bg-white/70 px-3 py-2">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-amber-500">Jumlah</p>
                            <p className="text-sm font-black text-amber-900">{formatCurrency(pendingRequest.amountIdr)}</p>
                          </div>
                          <div className="rounded-xl bg-white/70 px-3 py-2">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-amber-500">Tanggal</p>
                            <p className="text-sm font-bold text-amber-900">{formatDateTime(pendingRequest.createdAt)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* Current Plan Details */}
              {sub && (
                <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={18} className="text-indigo-500" />
                      <h2 className="font-black text-slate-900">Subscription Saat Ini</h2>
                    </div>
                    <span className={clsx("rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest", statusColors[sub.status] ?? "bg-slate-100 text-slate-500")}>
                      {sub.status === "pending_approval" ? "Menunggu Persetujuan" : sub.status}
                    </span>
                  </div>
                  <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: "Plan", value: sub.planId || "Free" },
                      { label: "Toko", value: sub.tenantName },
                      { label: "Berakhir", value: sub.periodEnd ? formatDateTime(sub.periodEnd) : "—" },
                      { label: "Bayar Terakhir", value: sub.lastPaymentAt ? formatDateTime(sub.lastPaymentAt) : "—" },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                        <p className="font-bold text-slate-900 text-sm">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Usage bar */}
                  <div className="px-6 pb-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { label: "Member", current: sub.memberCount, max: allPlans.find(p => p.id === currentPlanId)?.maxUsers ?? 999 },
                      { label: "Produk", current: sub.productCount, max: allPlans.find(p => p.id === currentPlanId)?.maxProducts ?? 999 },
                      { label: "Transaksi Bulan Ini", current: sub.txThisMonth, max: allPlans.find(p => p.id === currentPlanId)?.transactionsPerMonth ?? 999 },
                    ].map(({ label, current, max }) => {
                      const pct = Math.min(100, Math.round((current / max) * 100));
                      return (
                        <div key={label} className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs font-bold text-slate-600">{label}</p>
                            <p className="text-xs font-black text-slate-900">{current.toLocaleString("id")} / {max.toLocaleString("id")}</p>
                          </div>
                          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div className={clsx("h-full rounded-full transition-all duration-700",
                              pct >= 90 ? "bg-rose-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500"
                            )} style={{ width: `${pct}%` }} />
                          </div>
                          <p className={clsx("text-[10px] font-bold mt-1",
                            pct >= 90 ? "text-rose-500" : "text-slate-400")}>
                            {pct >= 90 ? "⚠ Mendekati batas!" : `${pct}% terpakai`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Owner-only notice if not owner */}
              {!isOwner && (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 flex gap-3">
                  <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 font-medium">
                    Hanya <strong>Owner</strong> yang dapat mengubah atau upgrade subscription.
                    Hubungi owner toko untuk melakukan perubahan plan.
                  </p>
                </div>
              )}

              {/* Plans */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">Pilih Paket</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Upgrade kapanpun, akan diaktifkan setelah dikonfirmasi admin</p>
                  </div>
                  {/* Billing toggle */}
                  <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
                    {(["monthly", "yearly"] as const).map((t) => (
                      <button key={t} onClick={() => setTab(t)}
                        className={clsx("rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition",
                          tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                        {t === "monthly" ? "Bulanan" : "Tahunan"}
                      </button>
                    ))}
                  </div>
                </div>

                {tab === "yearly" && (
                  <div className="mb-4 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-600" />
                    <p className="text-sm font-bold text-amber-800">Hemat hingga 17% dengan paket tahunan!</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredPlans.length === 0 ? (
                    <p className="text-slate-400 text-sm col-span-3 text-center py-10">Tidak ada plan untuk periode ini.</p>
                  ) : filteredPlans.map(plan => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      isCurrent={plan.id === currentPlanId}
                      onSelect={setSelectedPlan}
                      disabled={!isOwner || isPendingApproval}
                      hasPending={isPendingApproval && pendingRequest?.requestedPlanId === plan.id}
                    />
                  ))}
                </div>
              </section>

              {/* Recent Activity */}
              {data.recentActivity.length > 0 && (
                <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
                    <Clock size={18} className="text-slate-500" />
                    <h2 className="font-black text-slate-900">Aktivitas Terakhir</h2>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {data.recentActivity.map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-2xl bg-emerald-100 flex items-center justify-center">
                            <Receipt size={16} className="text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm font-mono">{tx.invoiceCode}</p>
                            <p className="text-xs text-slate-500">{formatDateTime(tx.createdAt)} · {tx.paymentMethod}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-emerald-600">{formatCurrency(tx.totalPrice)}</p>
                          <p className={clsx("text-[10px] font-bold uppercase", tx.status === "completed" ? "text-emerald-500" : "text-slate-400")}>
                            {tx.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* FAQ / Info */}
              <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
                <h2 className="font-black text-slate-900 mb-4 text-lg">Pertanyaan Umum</h2>
                <div className="space-y-4">
                  {[
                    {
                      q: "Bagaimana cara upgrade plan?",
                      a: "Pilih plan yang diinginkan, klik tombol 'Pilih Plan', pilih metode pembayaran, dan kirim permintaan. Plan akan aktif setelah admin mengkonfirmasi pembayaran.",
                    },
                    {
                      q: "Berapa lama proses verifikasi?",
                      a: "Proses verifikasi biasanya memakan waktu 1x24 jam kerja. Anda bisa memantau status permintaan di halaman ini.",
                    },
                    {
                      q: "Apakah data saya aman saat downgrade?",
                      a: "Ya, semua data Anda tetap aman. Data yang melebihi batas plan baru tidak akan terhapus, namun tidak dapat ditambah sampai Anda upgrade kembali.",
                    },
                    {
                      q: "Siapa yang bisa mengubah subscription?",
                      a: "Hanya akun dengan role Owner yang dapat mengubah, upgrade, atau downgrade subscription toko.",
                    },
                  ].map(({ q, a }) => (
                    <div key={q} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                      <p className="font-bold text-slate-900 text-sm mb-1">{q}</p>
                      <p className="text-sm text-slate-500">{a}</p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {selectedPlan && (
        <PaymentModal
          plan={selectedPlan}
          currentPlanId={currentPlanId}
          availableMethods={data?.paymentMethods ?? []}
          onConfirm={handleUpgrade}
          onClose={() => setSelectedPlan(null)}
        />
      )}
    </AppShell>
  );
}
