"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { getAdminTenants, deleteAdminTenant, updateAdminTenant } from "@/services/admin-service";
import type { AdminTenant } from "@/types/pos";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { CheckCircle2, MoreVertical, PencilLine, Trash2 } from "lucide-react";
import { clsx } from "clsx";

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", status: "", plan: "" });

  const fetchData = async () => {
    try {
      const data = await getAdminTenants();
      setTenants(data);
    } catch (error) {
      console.error("Failed to fetch tenants:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus tenant ini? Semua data terkait (produk, transaksi, dll) akan ikut terhapus.")) return;
    try {
      await deleteAdminTenant(id);
      fetchData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal menghapus tenant");
    }
  };

  const handleEdit = (tenant: AdminTenant) => {
    setEditingId(tenant.id);
    setEditForm({ name: tenant.name, status: tenant.status, plan: tenant.plan });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await updateAdminTenant(editingId, editForm);
      setEditingId(null);
      fetchData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal memperbarui tenant");
    }
  };

  return (
    <AdminShell>
      <div className="p-6 xl:p-8">
        <h1 className="text-3xl font-black text-slate-900">Tenants</h1>
        <p className="mt-1 text-sm text-slate-500">Kelola semua tenant dan status subscription mereka.</p>

        <div className="mt-6 overflow-x-auto rounded-[2rem] border border-slate-200 bg-white p-2">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.16em] text-slate-400 bg-slate-50 rounded-t-[1.5rem]">
              <tr>
                <th className="py-4 px-4 font-bold rounded-tl-[1.5rem]">Tenant</th>
                <th className="px-4 font-bold">Owner</th>
                <th className="px-4 font-bold">Plan / Status</th>
                <th className="px-4 font-bold">Stats</th>
                <th className="px-4 font-bold">Revenue</th>
                <th className="px-4 font-bold text-right rounded-tr-[1.5rem]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-semibold">Loading data...</td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.id} className="font-medium text-slate-700">
                    <td className="py-4 px-4">
                      {editingId === tenant.id ? (
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 px-3 py-1 outline-none focus:border-emerald-300"
                        />
                      ) : (
                        <div>
                          <p className="font-black text-slate-900">{tenant.name}</p>
                          <p className="text-xs text-slate-400 font-mono mt-1">{tenant.id}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-4">
                      <p className="font-bold text-slate-900">{tenant.ownerName}</p>
                      <p className="text-xs text-slate-500">{tenant.ownerEmail}</p>
                    </td>
                    <td className="px-4">
                      {editingId === tenant.id ? (
                        <div className="flex gap-2">
                          <select
                            value={editForm.plan}
                            onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                            className="rounded-xl border border-slate-200 px-2 py-1 outline-none"
                          >
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                            <option value="business">Business</option>
                          </select>
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                            className="rounded-xl border border-slate-200 px-2 py-1 outline-none"
                          >
                            <option value="trial">Trial</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                          </select>
                        </div>
                      ) : (
                        <div>
                          <span className={clsx(
                            "inline-block rounded-full px-2 py-0.5 text-xs font-black uppercase tracking-wider mb-1",
                            tenant.plan === "free" ? "bg-slate-100 text-slate-600" :
                            tenant.plan === "pro" ? "bg-indigo-100 text-indigo-700" :
                            "bg-amber-100 text-amber-700"
                          )}>
                            {tenant.plan}
                          </span>
                          <br />
                          <span className={clsx(
                            "inline-block rounded-full px-2 py-0.5 text-xs font-bold",
                            tenant.status === "active" ? "text-emerald-600 bg-emerald-50" :
                            tenant.status === "trial" ? "text-cyan-600 bg-cyan-50" :
                            "text-rose-600 bg-rose-50"
                          )}>
                            {tenant.status}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 text-xs font-semibold text-slate-500">
                      <p>{tenant.memberCount} Members</p>
                      <p>{tenant.productCount} Products</p>
                    </td>
                    <td className="px-4 font-black text-slate-900">
                      {formatCurrency(tenant.totalRevenue)}
                    </td>
                    <td className="px-4 text-right">
                      {editingId === tenant.id ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={saveEdit} className="rounded-xl bg-emerald-100 p-2 text-emerald-700 hover:bg-emerald-200">
                            <CheckCircle2 size={16} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="rounded-xl bg-slate-100 p-2 text-slate-700 hover:bg-slate-200">
                            Batal
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEdit(tenant)} className="rounded-xl bg-slate-100 p-2 text-slate-700 hover:bg-slate-200">
                            <PencilLine size={16} />
                          </button>
                          <button onClick={() => handleDelete(tenant.id)} className="rounded-xl bg-rose-50 p-2 text-rose-600 hover:bg-rose-100">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
