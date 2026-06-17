"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminShell } from "@/components/admin-shell";
import {
  getAdminTenants,
  getAdminTenantDetail,
  deleteAdminTenant,
  updateAdminTenant,
  type AdminTenantDetail,
  type AdminMember,
  type AdminBranch,
  type AdminTransaction,
} from "@/services/admin-service";
import type { AdminTenant } from "@/types/pos";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Eye,
  GitBranch,
  Loader2,
  Package,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
  Users,
  X,
  TrendingUp,
} from "lucide-react";
import { clsx } from "clsx";

const planColor: Record<string, string> = {
  free: "bg-slate-100 text-slate-600",
  pro: "bg-indigo-100 text-indigo-700",
  business: "bg-amber-100 text-amber-700",
};
const statusColor: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  trial: "bg-cyan-100 text-cyan-700",
  suspended: "bg-rose-100 text-rose-700",
  past_due: "bg-orange-100 text-orange-700",
  cancelled: "bg-slate-100 text-slate-500",
};
const roleColor: Record<string, string> = {
  owner: "bg-amber-100 text-amber-700",
  admin: "bg-indigo-100 text-indigo-700",
  cashier: "bg-slate-100 text-slate-600",
};

// ─── Tenant Detail Drawer ─────────────────────────────────────────────────────
function TenantDetailDrawer({
  tenantId,
  onClose,
  onUpdated,
}: {
  tenantId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [detail, setDetail] = useState<{
    tenant: AdminTenantDetail;
    members: AdminMember[];
    branches: AdminBranch[];
    recentTransactions: AdminTransaction[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: "", status: "", plan: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "members" | "branches" | "transactions">("overview");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminTenantDetail(tenantId);
      setDetail(data);
      setForm({ name: data.tenant.name, status: data.tenant.status, plan: data.tenant.plan });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await updateAdminTenant(tenantId, form);
      setEditMode(false);
      load();
      onUpdated();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: "overview", label: "Overview", icon: TrendingUp },
    { key: "members", label: "Members", icon: Users },
    { key: "branches", label: "Cabang", icon: GitBranch },
    { key: "transactions", label: "Transaksi", icon: Receipt },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <p className="font-black text-slate-900 text-sm">Detail Toko</p>
              {detail && <p className="text-xs text-slate-500 font-mono">{detail.tenant.slug}</p>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100 text-slate-500 transition">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-slate-300" />
          </div>
        ) : error ? (
          <div className="m-6 rounded-2xl bg-rose-50 p-4 text-rose-700 text-sm font-semibold flex gap-2 items-center">
            <AlertTriangle size={16} /> {error}
          </div>
        ) : detail ? (
          <>
            {/* Tenant Summary */}
            <div className="px-6 pt-4 pb-0">
              {editMode ? (
                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4 space-y-3 mb-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Nama Toko</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-emerald-400 bg-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Plan</label>
                      <select value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-2 py-2 text-sm outline-none bg-white">
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="business">Business</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Status</label>
                      <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-2 py-2 text-sm outline-none bg-white">
                        <option value="trial">Trial</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                  </div>
                  {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
                  <div className="flex gap-2">
                    <button onClick={handleSave} disabled={saving}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Simpan
                    </button>
                    <button onClick={() => { setEditMode(false); setError(""); }}
                      className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 transition">Batal</button>
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-black text-slate-900">{detail.tenant.name}</h2>
                      <p className="text-xs text-slate-500">Owner: <span className="font-bold text-slate-700">{detail.tenant.ownerName}</span> · {detail.tenant.ownerEmail}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={clsx("rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest", planColor[detail.tenant.plan] ?? "bg-slate-100 text-slate-600")}>
                        {detail.tenant.plan}
                      </span>
                      <span className={clsx("rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest", statusColor[detail.tenant.status] ?? "bg-slate-100 text-slate-500")}>
                        {detail.tenant.status}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setEditMode(true)}
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition">
                    Edit Toko & Subscription
                  </button>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pb-3 border-b border-slate-100 overflow-x-auto">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={clsx(
                    "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition",
                    activeTab === key ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-100"
                  )}>
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "overview" && (
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Total Revenue", value: formatCurrency(detail.tenant.totalRevenue), icon: TrendingUp, color: "text-emerald-600" },
                      { label: "Transaksi", value: detail.tenant.totalTransactions, icon: ShoppingCart, color: "text-indigo-600" },
                      { label: "Members", value: detail.tenant.memberCount, icon: Users, color: "text-slate-700" },
                      { label: "Produk", value: detail.tenant.productCount, icon: Package, color: "text-amber-600" },
                    ].map(({ label, value, icon: Icon, color }) => (
                      <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                          <Icon size={14} className={color} />
                        </div>
                        <p className={clsx("text-xl font-black", color)}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Subscription detail */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Subscription</p>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold">Status Sub</p>
                        <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-black", statusColor[detail.tenant.subStatus] ?? "bg-slate-100")}>
                          {detail.tenant.subStatus || "-"}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold">Plan ID</p>
                        <p className="font-bold text-slate-900 text-xs">{detail.tenant.planId || "-"}</p>
                      </div>
                      {detail.tenant.trialEndsAt && (
                        <div className="col-span-2">
                          <p className="text-[10px] text-slate-400 font-bold">Trial Berakhir</p>
                          <p className="text-xs font-bold text-amber-700">{formatDateTime(detail.tenant.trialEndsAt)}</p>
                        </div>
                      )}
                      {detail.tenant.periodEnd && (
                        <div className="col-span-2">
                          <p className="text-[10px] text-slate-400 font-bold">Periode Berakhir</p>
                          <p className="text-xs font-bold text-slate-700">{formatDateTime(detail.tenant.periodEnd)}</p>
                        </div>
                      )}
                      {detail.tenant.lastPaymentAt && (
                        <div className="col-span-2">
                          <p className="text-[10px] text-slate-400 font-bold">Pembayaran Terakhir</p>
                          <p className="text-xs font-bold text-emerald-700">{formatDateTime(detail.tenant.lastPaymentAt)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Info Toko</p>
                    <p className="text-xs text-slate-500">Dibuat: <span className="font-bold text-slate-700">{formatDateTime(detail.tenant.createdAt)}</span></p>
                    <p className="text-xs text-slate-500 mt-1">Slug: <span className="font-mono text-slate-700">{detail.tenant.slug}</span></p>
                  </div>
                </div>
              )}

              {activeTab === "members" && (
                <div className="space-y-2">
                  {detail.members.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-8">Tidak ada member</p>
                  ) : detail.members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-xs font-black text-slate-600">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{m.name}</p>
                          <p className="text-xs text-slate-500">{m.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-black uppercase", roleColor[m.role] ?? "bg-slate-100")}>
                          {m.role}
                        </span>
                        <span className={clsx("text-[10px] font-bold", m.status === "active" ? "text-emerald-600" : "text-rose-500")}>
                          {m.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "branches" && (
                <div className="space-y-2">
                  {detail.branches.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-8">Tidak ada cabang</p>
                  ) : detail.branches.map((b) => (
                    <div key={b.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GitBranch size={14} className="text-slate-400" />
                          <p className="font-bold text-slate-900 text-sm">{b.name}</p>
                        </div>
                        <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-bold", b.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                          {b.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                      {b.address && <p className="text-xs text-slate-500 mt-1 ml-5">{b.address}</p>}
                      {b.phone && <p className="text-xs text-slate-500 mt-0.5 ml-5">{b.phone}</p>}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "transactions" && (
                <div className="space-y-2">
                  {detail.recentTransactions.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-8">Belum ada transaksi</p>
                  ) : detail.recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div>
                        <p className="font-bold text-slate-900 text-sm font-mono">{tx.invoiceCode}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(tx.createdAt)} · {tx.paymentMethod}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-emerald-600 text-sm">{formatCurrency(tx.totalPrice)}</p>
                        <span className={clsx("text-[10px] font-bold", tx.status === "completed" ? "text-emerald-500" : "text-rose-500")}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPlan, setFilterPlan] = useState("all");
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await getAdminTenants();
      setTenants(data);
    } catch (error) {
      console.error("Failed to fetch tenants:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Yakin ingin menghapus toko "${name}"?\n\nSemua data (produk, transaksi, member) akan ikut terhapus permanen.`)) return;
    try {
      await deleteAdminTenant(id);
      fetchData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal menghapus tenant");
    }
  };

  const filtered = tenants.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      t.ownerEmail.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    const matchPlan = filterPlan === "all" || t.plan === filterPlan;
    return matchSearch && matchStatus && matchPlan;
  });

  const totalRevenue = tenants.reduce((sum, t) => sum + Number(t.totalRevenue ?? 0), 0);

  return (
    <AdminShell>
      <div className="p-6 xl:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-slate-900">Tenants</h1>
          <p className="mt-1 text-sm text-slate-500">{tenants.length} toko terdaftar di platform</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Toko", value: tenants.length, color: "text-slate-900" },
            { label: "Active", value: tenants.filter(t => t.status === "active").length, color: "text-emerald-600" },
            { label: "Trial", value: tenants.filter(t => t.status === "trial").length, color: "text-cyan-600" },
            { label: "Total Revenue", value: formatCurrency(totalRevenue), color: "text-indigo-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{s.label}</p>
              <p className={clsx("text-xl font-black mt-0.5 truncate", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama toko, owner…"
              className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm font-medium outline-none focus:border-emerald-400 shadow-sm" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none shadow-sm">
            <option value="all">Semua Status</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
          </select>
          <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none shadow-sm">
            <option value="all">Semua Plan</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-5 py-4 rounded-tl-3xl">Toko</th>
                <th className="px-4 py-4">Owner</th>
                <th className="px-4 py-4">Plan / Status</th>
                <th className="px-4 py-4">Stats</th>
                <th className="px-4 py-4">Revenue</th>
                <th className="px-4 py-4 text-right rounded-tr-3xl">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center"><Loader2 size={24} className="animate-spin text-slate-300 mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-sm text-slate-400 font-semibold">Tidak ada data tenant.</td></tr>
              ) : filtered.map((tenant) => (
                <tr key={tenant.id} onClick={() => setSelectedTenantId(tenant.id)}
                  className="hover:bg-slate-50 transition cursor-pointer group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-sm font-black text-emerald-700 flex-shrink-0">
                        {tenant.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-slate-900">{tenant.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{tenant.id.slice(0, 20)}…</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-bold text-slate-800 text-sm">{tenant.ownerName}</p>
                    <p className="text-xs text-slate-500">{tenant.ownerEmail}</p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={clsx("w-fit rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider", planColor[tenant.plan] ?? "bg-slate-100 text-slate-600")}>
                        {tenant.plan}
                      </span>
                      <span className={clsx("w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", statusColor[tenant.status] ?? "bg-slate-100")}>
                        {tenant.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-xs font-semibold text-slate-500">
                    <div className="flex items-center gap-1 mb-0.5"><Users size={11} /> {tenant.memberCount} members</div>
                    <div className="flex items-center gap-1"><Package size={11} /> {tenant.productCount} produk</div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-black text-slate-900">{formatCurrency(tenant.totalRevenue)}</p>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={e => { e.stopPropagation(); setSelectedTenantId(tenant.id); }}
                        className="rounded-xl bg-emerald-50 p-2 text-emerald-600 hover:bg-emerald-100 transition">
                        <Eye size={14} />
                      </button>
                      <button onClick={e => handleDelete(tenant.id, tenant.name, e)}
                        className="rounded-xl bg-rose-50 p-2 text-rose-500 hover:bg-rose-100 transition">
                        <Trash2 size={14} />
                      </button>
                      <ChevronRight size={14} className="text-slate-300" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTenantId && (
        <TenantDetailDrawer
          tenantId={selectedTenantId}
          onClose={() => setSelectedTenantId(null)}
          onUpdated={fetchData}
        />
      )}
    </AdminShell>
  );
}
