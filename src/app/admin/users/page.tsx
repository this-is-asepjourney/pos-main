"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { getAdminUsers, deleteAdminUser, updateAdminUser } from "@/services/admin-service";
import type { AdminUser } from "@/types/pos";
import { formatDateTime } from "@/lib/format";
import { CheckCircle2, PencilLine, ShieldAlert, Trash2 } from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", isSuperadmin: false });

  const fetchData = async () => {
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus user ini?")) return;
    try {
      await deleteAdminUser(id);
      fetchData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal menghapus user");
    }
  };

  const handleEdit = (user: AdminUser) => {
    setEditingId(user.id);
    setEditForm({ name: user.name, email: user.email, isSuperadmin: user.isSuperadmin });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await updateAdminUser(editingId, editForm);
      setEditingId(null);
      fetchData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal memperbarui user");
    }
  };

  return (
    <AdminShell>
      <div className="p-6 xl:p-8">
        <h1 className="text-3xl font-black text-slate-900">Users</h1>
        <p className="mt-1 text-sm text-slate-500">Daftar semua user terdaftar beserta privilege-nya.</p>

        <div className="mt-6 overflow-x-auto rounded-[2rem] border border-slate-200 bg-white p-2">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.16em] text-slate-400 bg-slate-50 rounded-t-[1.5rem]">
              <tr>
                <th className="py-4 px-4 font-bold rounded-tl-[1.5rem]">Nama</th>
                <th className="px-4 font-bold">Email</th>
                <th className="px-4 font-bold">Role</th>
                <th className="px-4 font-bold">Tenants</th>
                <th className="px-4 font-bold">Daftar</th>
                <th className="px-4 font-bold text-right rounded-tr-[1.5rem]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-semibold">Loading data...</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="font-medium text-slate-700 hover:bg-slate-50 transition">
                    <td className="py-4 px-4">
                      {editingId === user.id ? (
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 px-3 py-1 outline-none focus:border-emerald-300"
                        />
                      ) : (
                        <p className="font-black text-slate-900">{user.name}</p>
                      )}
                    </td>
                    <td className="px-4">
                      {editingId === user.id ? (
                        <input
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 px-3 py-1 outline-none focus:border-emerald-300"
                        />
                      ) : (
                        <p>{user.email}</p>
                      )}
                    </td>
                    <td className="px-4">
                      {editingId === user.id ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.isSuperadmin}
                            onChange={(e) => setEditForm({ ...editForm, isSuperadmin: e.target.checked })}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                          />
                          <span className="text-xs font-bold text-slate-600">Super Admin</span>
                        </label>
                      ) : (
                        user.isSuperadmin ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                            <ShieldAlert size={12} />
                            Super Admin
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">User Biasa</span>
                        )
                      )}
                    </td>
                    <td className="px-4">
                      <span className="font-bold">{user.tenantCount}</span> toko
                    </td>
                    <td className="px-4 text-xs">
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td className="px-4 text-right">
                      {editingId === user.id ? (
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
                          <button onClick={() => handleEdit(user)} className="rounded-xl bg-slate-100 p-2 text-slate-700 hover:bg-slate-200">
                            <PencilLine size={16} />
                          </button>
                          <button onClick={() => handleDelete(user.id)} className="rounded-xl bg-rose-50 p-2 text-rose-600 hover:bg-rose-100">
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
