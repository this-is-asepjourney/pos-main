"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Bell, Plus, Loader2, Send } from "lucide-react";
import { clsx } from "clsx";
import { formatDateTime } from "@/lib/format";

type Notification = {
  id: number;
  title: string;
  message: string;
  type: "info" | "promo" | "warning";
  target_tenant_id: string | null;
  tenant_name: string | null;
  created_at: string;
};

type Tenant = { id: string; name: string };

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  
  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "info",
    target_tenant_id: ""
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [notifRes, tenantRes] = await Promise.all([
        fetch("/api/admin/notifications"),
        fetch("/api/admin/tenants")
      ]);
      const notifData = await notifRes.json();
      const tenantData = await tenantRes.json();
      setNotifications(notifData.notifications || []);
      setTenants(tenantData.tenants || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          message: form.message,
          type: form.type,
          target_tenant_id: form.target_tenant_id === "all" ? null : form.target_tenant_id
        }),
      });

      if (!res.ok) throw new Error("Gagal mengirim");
      setIsModalOpen(false);
      setForm({ title: "", message: "", type: "info", target_tenant_id: "" });
      loadData();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminShell>
      <div className="p-6 xl:p-8 space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 text-sm font-bold mb-1">
              <Bell size={16} />
              Komunikasi
            </div>
            <h1 className="text-3xl font-black text-slate-900">Notifikasi Klien</h1>
            <p className="mt-1 text-sm text-slate-500">
              Kirim pesan peringatan, promo, atau pengumuman ke klien.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition"
          >
            <Plus size={16} /> Buat Pesan Baru
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-400">
                <tr>
                  <th className="px-6 py-4">Tipe & Target</th>
                  <th className="px-6 py-4">Pesan</th>
                  <th className="px-6 py-4">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notifications.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 align-top">
                      <span className={clsx("inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase mb-1", 
                        n.type === 'promo' ? 'bg-amber-100 text-amber-700' :
                        n.type === 'warning' ? 'bg-rose-100 text-rose-700' :
                        'bg-sky-100 text-sky-700')}>
                        {n.type}
                      </span>
                      <p className="font-bold text-slate-800">{n.target_tenant_id ? n.tenant_name : 'Global (Semua)'}</p>
                    </td>
                    <td className="px-6 py-4 max-w-md align-top">
                      <p className="font-bold text-slate-900 mb-1">{n.title}</p>
                      <p className="text-xs">{n.message}</p>
                    </td>
                    <td className="px-6 py-4 align-top whitespace-nowrap text-xs font-medium text-slate-500">
                      {formatDateTime(n.created_at)}
                    </td>
                  </tr>
                ))}
                {notifications.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500">Belum ada notifikasi terkirim.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-black text-slate-900 mb-6">Tulis Pesan Baru</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">Target Penerima</label>
                <select required value={form.target_tenant_id} onChange={e => setForm({...form, target_tenant_id: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2">
                  <option value="" disabled>Pilih Target...</option>
                  <option value="all">Semua Tenant (Global)</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.id})</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">Tipe Pesan</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value as any})} className="w-full rounded-xl border border-slate-200 px-4 py-2">
                  <option value="info">Informasi</option>
                  <option value="promo">Promosi</option>
                  <option value="warning">Peringatan</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">Judul</label>
                <input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2" placeholder="Judul pesan..." />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">Isi Pesan</label>
                <textarea required rows={4} value={form.message} onChange={e => setForm({...form, message: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2 resize-none" placeholder="Ketik pesan Anda di sini..." />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-xl border border-slate-200 py-3 font-bold text-slate-700 hover:bg-slate-50">Batal</button>
                <button type="submit" disabled={sending} className="flex-1 rounded-xl bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center gap-2">
                  {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  Kirim Pesan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
