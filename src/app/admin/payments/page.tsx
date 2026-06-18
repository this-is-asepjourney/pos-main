"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Eye,
  Filter,
  Loader2,
  Receipt,
  RefreshCw,
  Search,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import {
  getSubscriptionRequests,
  approveSubscriptionRequest,
  rejectSubscriptionRequest,
  type AdminSubscriptionRequest,
  type AdminRequestStats,
} from "@/services/admin-service";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { clsx } from "clsx";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:  { label: "Menunggu",  color: "bg-amber-100 text-amber-700 border-amber-200",     icon: Clock },
  approved: { label: "Disetujui", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  rejected: { label: "Ditolak",   color: "bg-rose-100 text-rose-700 border-rose-200",          icon: XCircle },
  cancelled:{ label: "Dibatalkan", color: "bg-slate-100 text-slate-500 border-slate-200",      icon: Ban },
};

const planColors: Record<string, string> = {
  free:     "bg-slate-100 text-slate-600",
  starter:  "bg-sky-100 text-sky-700",
  pro:      "bg-indigo-100 text-indigo-700",
  business: "bg-amber-100 text-amber-700",
};

const methodLabels: Record<string, string> = {
  transfer: "🏦 Transfer Bank",
  qris:     "📱 QRIS",
  manual:   "📞 Manual",
};

// ─── Detail / Action Modal ──────────────────────────────────────────────────
function RequestModal({
  request,
  onClose,
  onApprove,
  onReject,
}: {
  request: AdminSubscriptionRequest;
  onClose: () => void;
  onApprove: (id: string, payload: { paymentMethod?: string; adminNote?: string }) => Promise<void>;
  onReject: (id: string, payload: { adminNote?: string }) => Promise<void>;
}) {
  const [action, setAction] = useState<"view" | "approve" | "reject">("view");
  const [paymentMethod, setPaymentMethod] = useState(request.paymentMethod || "transfer");
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isPending = request.status === "pending";
  const sc = statusConfig[request.status] ?? statusConfig.pending;
  const StatusIcon = sc.icon;

  const handleApprove = async () => {
    setProcessing(true);
    setError("");
    try {
      await onApprove(request.id, { paymentMethod, adminNote: adminNote || undefined });
      setSuccess("Request berhasil disetujui!");
      setAction("view");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    setError("");
    try {
      await onReject(request.id, { adminNote: adminNote || undefined });
      setSuccess("Request berhasil ditolak.");
      setAction("view");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={!processing ? onClose : undefined} />

      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-white/15 flex items-center justify-center">
                <Wallet size={20} />
              </div>
              <div>
                <p className="font-black text-lg">Detail Permintaan</p>
                <p className="text-indigo-300 text-xs">{request.tenantName}</p>
              </div>
            </div>
            {!processing && (
              <button onClick={onClose} className="rounded-xl p-1.5 hover:bg-white/20 transition">
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Success message */}
          {success && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex gap-2 items-center">
              <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
              <p className="text-sm font-bold text-emerald-700">{success}</p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 flex gap-2 items-center">
              <AlertTriangle size={16} className="text-rose-600 flex-shrink-0" />
              <p className="text-sm font-bold text-rose-700">{error}</p>
            </div>
          )}

          {/* Request info */}
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">Status</span>
              <span className={clsx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest", sc.color)}>
                <StatusIcon size={10} />
                {sc.label}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">Tenant</span>
              <span className="font-bold text-slate-900 text-sm">{request.tenantName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">Owner</span>
              <span className="text-sm text-slate-700">{request.ownerName} ({request.ownerEmail})</span>
            </div>
            <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">Plan Saat Ini</span>
              <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-black uppercase", planColors[request.currentPlanId] ?? "bg-slate-100 text-slate-600")}>
                {request.currentPlanId || "free"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">Plan Diminta</span>
              <div className="flex items-center gap-2">
                <ArrowUpRight size={12} className="text-indigo-500" />
                <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-black uppercase", planColors[request.requestedPlanId?.split("-")[0]] ?? "bg-indigo-100 text-indigo-700")}>
                  {request.requestedPlanName}
                </span>
              </div>
            </div>
            <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">Jumlah</span>
              <span className="font-black text-indigo-600 text-lg">{formatCurrency(request.amountIdr)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">Metode Bayar</span>
              <span className="font-bold text-slate-900 text-sm">{methodLabels[request.paymentMethod] ?? request.paymentMethod}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">Tanggal Request</span>
              <span className="text-sm text-slate-700">{formatDateTime(request.createdAt)}</span>
            </div>
          </div>

          {/* Payment proof note */}
          {request.paymentProofNote && (
            <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Catatan Pembayaran dari Client</p>
              <p className="text-sm text-blue-800 font-medium whitespace-pre-wrap">{request.paymentProofNote}</p>
            </div>
          )}

          {/* Admin note (if already processed) */}
          {request.adminNote && (
            <div className="rounded-2xl bg-slate-100 border border-slate-200 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Catatan Admin</p>
              <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap">{request.adminNote}</p>
            </div>
          )}

          {request.approvedByName && (
            <div className="text-xs text-slate-500">
              {request.status === "approved" ? "Disetujui" : "Diproses"} oleh <strong>{request.approvedByName}</strong>
              {request.approvedAt && ` pada ${formatDateTime(request.approvedAt)}`}
            </div>
          )}

          {/* ACTIONS (only for pending) */}
          {isPending && !success && (
            <>
              {action === "view" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setAction("approve")}
                    className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-black text-white hover:bg-emerald-700 transition flex items-center justify-center gap-2"
                  >
                    <Check size={16} /> Setujui
                  </button>
                  <button
                    onClick={() => setAction("reject")}
                    className="flex-1 rounded-2xl bg-rose-600 py-3 text-sm font-black text-white hover:bg-rose-700 transition flex items-center justify-center gap-2"
                  >
                    <X size={16} /> Tolak
                  </button>
                </div>
              )}

              {action === "approve" && (
                <div className="space-y-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
                  <p className="font-black text-emerald-800 text-sm">Setujui Permintaan</p>
                  <div>
                    <label className="text-xs font-bold text-emerald-700 block mb-1.5">Metode Pembayaran Dikonfirmasi</label>
                    <div className="flex gap-2">
                      {(["transfer", "qris", "manual"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaymentMethod(m)}
                          className={clsx(
                            "rounded-xl border-2 px-3 py-2 text-xs font-bold transition",
                            paymentMethod === m
                              ? "border-emerald-500 bg-emerald-100 text-emerald-800"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                          )}
                        >
                          {methodLabels[m]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-emerald-700 block mb-1.5">Catatan Admin (opsional)</label>
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Contoh: Pembayaran via BCA dikonfirmasi..."
                      rows={2}
                      className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setAction("view"); setError(""); }}
                      className="flex-shrink-0 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-white transition"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={processing}
                      className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-black text-white hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {processing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                      Konfirmasi Setujui
                    </button>
                  </div>
                </div>
              )}

              {action === "reject" && (
                <div className="space-y-4 rounded-2xl bg-rose-50 border border-rose-200 p-4">
                  <p className="font-black text-rose-800 text-sm">Tolak Permintaan</p>
                  <div>
                    <label className="text-xs font-bold text-rose-700 block mb-1.5">Alasan Penolakan</label>
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Contoh: Bukti pembayaran tidak valid..."
                      rows={2}
                      className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-rose-500 focus:outline-none resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setAction("view"); setError(""); }}
                      className="flex-shrink-0 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-white transition"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={processing}
                      className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-black text-white hover:bg-rose-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {processing ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                      Konfirmasi Tolak
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Close button (bottom) */}
          {(success || !isPending) && (
            <button
              onClick={onClose}
              className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-700 transition"
            >
              Tutup
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminPaymentsPage() {
  const [requests, setRequests] = useState<AdminSubscriptionRequest[]>([]);
  const [stats, setStats] = useState<AdminRequestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<AdminSubscriptionRequest | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await getSubscriptionRequests(statusFilter, search);
      setRequests(data.requests);
      setStats(data.stats);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string, payload: { paymentMethod?: string; adminNote?: string }) => {
    await approveSubscriptionRequest(id, payload);
    await load();
  };

  const handleReject = async (id: string, payload: { adminNote?: string }) => {
    await rejectSubscriptionRequest(id, payload);
    await load();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const statCards = [
    { label: "Menunggu", value: stats?.pending ?? 0, gradient: "from-amber-500 to-orange-500", icon: Clock, pulse: (stats?.pending ?? 0) > 0 },
    { label: "Disetujui", value: stats?.approved ?? 0, gradient: "from-emerald-500 to-teal-500", icon: CheckCircle2 },
    { label: "Ditolak", value: stats?.rejected ?? 0, gradient: "from-rose-500 to-pink-500", icon: XCircle },
    { label: "Revenue Disetujui", value: formatCurrency(stats?.totalApprovedRevenue ?? 0), gradient: "from-indigo-500 to-purple-600", icon: Receipt },
  ];

  const filters = [
    { id: "all", label: "Semua" },
    { id: "pending", label: "Menunggu" },
    { id: "approved", label: "Disetujui" },
    { id: "rejected", label: "Ditolak" },
  ];

  return (
    <AdminShell>
      <div className="p-6 xl:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 text-sm font-bold mb-1">
              <Wallet size={16} />
              Manajemen Pembayaran
            </div>
            <h1 className="text-3xl font-black text-slate-900">Pembayaran & Subscription</h1>
            <p className="mt-1 text-sm text-slate-500">
              Monitor dan kelola permintaan upgrade subscription dari semua tenant.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/payment-methods"
              className="hidden sm:flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition shadow-sm"
            >
              <CreditCard size={14} /> Atur Metode Pembayaran
            </Link>
            <button
              onClick={() => { setLoading(true); load(); }}
              className="hidden sm:flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-3xl bg-slate-100 animate-pulse" />
            ))
          ) : (
            statCards.map(({ label, value, gradient, icon: Icon, pulse }) => (
              <div key={label} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition hover:-translate-y-0.5">
                <div className="flex items-start justify-between">
                  <div className={clsx("size-11 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white", gradient)}>
                    <Icon size={20} />
                  </div>
                  {pulse && (
                    <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1">
                      <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Aksi</span>
                    </span>
                  )}
                </div>
                <p className="mt-4 text-3xl font-black tracking-tight text-slate-950 truncate">{value}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{label}</p>
              </div>
            ))
          )}
        </div>

        {/* Error */}
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Status filter */}
          <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
            <Filter size={14} className="text-slate-400 ml-2 mr-1 flex-shrink-0" />
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={clsx(
                  "rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest transition",
                  statusFilter === f.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {f.label}
                {f.id === "pending" && (stats?.pending ?? 0) > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center size-4 rounded-full bg-amber-500 text-white text-[9px] font-black">
                    {stats?.pending}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari nama tenant..."
                className="w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700 transition"
            >
              Cari
            </button>
          </form>
        </div>

        {/* Request list */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <CreditCard size={18} className="text-indigo-500" />
            <h2 className="font-black text-slate-900">Daftar Permintaan Subscription</h2>
            <span className="text-xs font-bold text-slate-400 ml-auto">{requests.length} data</span>
          </div>

          {loading ? (
            <div className="p-8 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="py-16 text-center">
              <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Receipt size={28} className="text-slate-400" />
              </div>
              <p className="font-bold text-slate-500 text-lg">Belum Ada Permintaan</p>
              <p className="text-sm text-slate-400 mt-1">Permintaan subscription akan muncul di sini saat tenant melakukan upgrade.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {requests.map((req) => {
                const sc = statusConfig[req.status] ?? statusConfig.pending;
                const StatusIcon = sc.icon;
                return (
                  <div
                    key={req.id}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition cursor-pointer group"
                    onClick={() => setSelectedRequest(req)}
                  >
                    {/* Status icon */}
                    <div className={clsx(
                      "size-10 rounded-2xl flex items-center justify-center flex-shrink-0",
                      req.status === "pending" ? "bg-amber-100" :
                      req.status === "approved" ? "bg-emerald-100" :
                      req.status === "rejected" ? "bg-rose-100" : "bg-slate-100"
                    )}>
                      <StatusIcon size={18} className={clsx(
                        req.status === "pending" ? "text-amber-600" :
                        req.status === "approved" ? "text-emerald-600" :
                        req.status === "rejected" ? "text-rose-600" : "text-slate-400"
                      )} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-slate-900 text-sm truncate">{req.tenantName}</p>
                        <span className={clsx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest flex-shrink-0", sc.color)}>
                          {sc.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className={clsx("rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase", planColors[req.currentPlanId] ?? "bg-slate-100 text-slate-500")}>
                          {req.currentPlanId || "free"}
                        </span>
                        <ArrowUpRight size={10} className="text-indigo-400" />
                        <span className={clsx("rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase", planColors[req.requestedPlanId?.split("-")[0]] ?? "bg-indigo-100 text-indigo-700")}>
                          {req.requestedPlanName}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span>{methodLabels[req.paymentMethod] ?? req.paymentMethod}</span>
                      </div>
                    </div>

                    {/* Amount + Date */}
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <p className="font-black text-indigo-600">{formatCurrency(req.amountIdr)}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{formatDateTime(req.createdAt)}</p>
                    </div>

                    {/* Quick actions (pending only) */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {req.status === "pending" && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); }}
                            className="rounded-xl p-2 text-emerald-600 hover:bg-emerald-50 transition"
                            title="Lihat & Proses"
                          >
                            <Eye size={16} />
                          </button>
                        </>
                      )}
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <RequestModal
          request={selectedRequest}
          onClose={() => { setSelectedRequest(null); load(); }}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </AdminShell>
  );
}
