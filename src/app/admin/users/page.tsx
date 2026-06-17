"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminShell } from "@/components/admin-shell";
import {
  getAdminUsers,
  getAdminUserDetail,
  deleteAdminUser,
  updateAdminUser,
  createAdminUser,
  type AdminUserDetail,
  type AdminUserMembership,
} from "@/services/admin-service";
import type { AdminUser } from "@/types/pos";
import { formatDateTime, formatCurrency } from "@/lib/format";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Eye,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  ShieldOff,
  Trash2,
  User,
  X,
  KeyRound,
} from "lucide-react";
import { clsx } from "clsx";

// ─── Status / Plan badges ────────────────────────────────────────────────────
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

// ─── User Detail Drawer ───────────────────────────────────────────────────────
function UserDetailDrawer({
  userId,
  onClose,
  onUpdated,
}: {
  userId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [detail, setDetail] = useState<{ user: AdminUserDetail; memberships: AdminUserMembership[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", isSuperadmin: false, password: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminUserDetail(userId);
      setDetail(data);
      setForm({
        name: data.user.name,
        email: data.user.email,
        isSuperadmin: data.user.isSuperadmin,
        password: "",
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await updateAdminUser(userId, form);
      setEditMode(false);
      load();
      onUpdated();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <User size={18} className="text-white" />
            </div>
            <div>
              <p className="font-black text-slate-900 text-sm">Detail User</p>
              {detail && <p className="text-xs text-slate-500 font-mono">{detail.user.id.slice(0, 16)}…</p>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100 text-slate-500 transition">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 size={28} className="animate-spin text-slate-300" />
            </div>
          ) : error ? (
            <div className="m-6 rounded-2xl bg-rose-50 p-4 text-rose-700 text-sm font-semibold flex gap-2 items-center">
              <AlertTriangle size={16} /> {error}
            </div>
          ) : detail ? (
            <div className="p-6 space-y-6">
              {/* Profile Card */}
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                {editMode ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Nama</label>
                      <input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Email</label>
                      <input
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                        Password Baru (kosongkan jika tidak diubah)
                      </label>
                      <div className="relative">
                        <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="password"
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-400 bg-white"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={form.isSuperadmin}
                        onChange={(e) => setForm({ ...form, isSuperadmin: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 accent-indigo-600"
                      />
                      <span className="text-sm font-bold text-slate-700">Super Admin Privilege</span>
                    </label>
                    {error && (
                      <p className="text-xs text-rose-600 font-semibold">{error}</p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition"
                      >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Simpan
                      </button>
                      <button
                        onClick={() => { setEditMode(false); setError(""); }}
                        className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 transition"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-2xl font-black text-slate-900">{detail.user.name}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{detail.user.email}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {detail.user.isSuperadmin ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">
                            <ShieldAlert size={12} /> Super Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                            <ShieldOff size={12} /> User Biasa
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-white p-3 border border-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Bergabung</p>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">{formatDateTime(detail.user.createdAt)}</p>
                      </div>
                      <div className="rounded-2xl bg-white p-3 border border-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Toko</p>
                        <p className="text-2xl font-black text-slate-900">{detail.memberships.length}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditMode(true)}
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
                    >
                      Edit Profil
                    </button>
                  </div>
                )}
              </div>

              {/* Memberships / Tenants */}
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                  Toko Terdaftar ({detail.memberships.length})
                </p>
                {detail.memberships.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 font-semibold">
                    Tidak ada toko
                  </div>
                ) : (
                  <div className="space-y-3">
                    {detail.memberships.map((m) => (
                      <div key={m.memberId} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="size-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center">
                              <Building2 size={14} className="text-slate-500" />
                            </div>
                            <div>
                              <p className="font-black text-slate-900 text-sm">{m.tenantName}</p>
                              <p className="text-xs text-slate-400 font-mono">{m.slug}</p>
                            </div>
                          </div>
                          <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest", roleColor[m.role] ?? "bg-slate-100 text-slate-600")}>
                            {m.role}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded-xl bg-white p-2 border border-slate-100 text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Plan</p>
                            <span className={clsx("text-xs font-black rounded-full px-2 py-0.5", planColor[m.plan] ?? "bg-slate-100 text-slate-600")}>
                              {m.plan}
                            </span>
                          </div>
                          <div className="rounded-xl bg-white p-2 border border-slate-100 text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                            <span className={clsx("text-xs font-black rounded-full px-2 py-0.5", statusColor[m.tenantStatus] ?? "bg-slate-100 text-slate-500")}>
                              {m.tenantStatus}
                            </span>
                          </div>
                          <div className="rounded-xl bg-white p-2 border border-slate-100 text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Members</p>
                            <p className="text-sm font-black text-slate-900">{m.memberCount}</p>
                          </div>
                        </div>
                        <div className="mt-2 rounded-xl bg-white p-2 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Revenue</p>
                          <p className="text-sm font-black text-emerald-600">{formatCurrency(m.totalRevenue)}</p>
                        </div>
                        {m.periodEnd && (
                          <p className="text-[10px] text-slate-400 mt-2 font-medium">
                            Subscription berakhir: {formatDateTime(m.periodEnd)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Create User Modal ────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", isSuperadmin: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createAdminUser(form);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-slate-900">Tambah User Baru</h2>
          <button onClick={onClose} className="rounded-xl p-1.5 hover:bg-slate-100 text-slate-500"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Nama Lengkap</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-indigo-400" placeholder="John Doe" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Email</label>
            <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" placeholder="john@example.com" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Password</label>
            <input required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" placeholder="Min. 6 karakter" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isSuperadmin} onChange={e => setForm({ ...form, isSuperadmin: e.target.checked })}
              className="w-4 h-4 rounded accent-indigo-600" />
            <span className="text-sm font-bold text-slate-700">Super Admin</span>
          </label>
          {error && <p className="text-sm text-rose-600 font-semibold">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Buat User
            </button>
            <button type="button" onClick={onClose}
              className="rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-700 hover:bg-slate-200 transition">Batal</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus user "${name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await deleteAdminUser(id);
      fetchData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal menghapus user");
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminShell>
      <div className="p-6 xl:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Users</h1>
            <p className="mt-1 text-sm text-slate-500">
              {users.length} user terdaftar di sistem
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 transition shadow-lg shadow-slate-950/20"
          >
            <Plus size={16} />
            Tambah User
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau email…"
            className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm font-medium outline-none focus:border-indigo-400 shadow-sm"
          />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Users", value: users.length, color: "text-slate-900" },
            { label: "Super Admin", value: users.filter(u => u.isSuperadmin).length, color: "text-indigo-600" },
            { label: "Punya Toko", value: users.filter(u => u.tenantCount > 0).length, color: "text-emerald-600" },
            { label: "Tanpa Toko", value: users.filter(u => u.tenantCount === 0).length, color: "text-amber-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{s.label}</p>
              <p className={clsx("text-2xl font-black mt-0.5", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-5 py-4 rounded-tl-3xl">User</th>
                <th className="px-4 py-4">Role</th>
                <th className="px-4 py-4">Toko</th>
                <th className="px-4 py-4">Bergabung</th>
                <th className="px-4 py-4 text-right rounded-tr-3xl">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <Loader2 size={24} className="animate-spin text-slate-300 mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-slate-400 font-semibold">
                    {search ? "Tidak ada user yang cocok." : "Belum ada user."}
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50 transition cursor-pointer group"
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-sm font-black text-slate-600 flex-shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-slate-900">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {user.isSuperadmin ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-700">
                          <ShieldAlert size={11} /> Super Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <ShieldOff size={11} /> User
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                        <Building2 size={11} /> {user.tenantCount} toko
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500 font-medium">
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedUserId(user.id); }}
                          className="rounded-xl bg-indigo-50 p-2 text-indigo-600 hover:bg-indigo-100 transition"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(user.id, user.name); }}
                          className="rounded-xl bg-rose-50 p-2 text-rose-500 hover:bg-rose-100 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                        <ChevronRight size={14} className="text-slate-300" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {selectedUserId && (
        <UserDetailDrawer
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onUpdated={fetchData}
        />
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchData}
        />
      )}
    </AdminShell>
  );
}
