"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { CreditCard, Plus, Trash2, Edit, RefreshCw, Loader2, Image as ImageIcon } from "lucide-react";
import { clsx } from "clsx";

type PaymentMethod = {
  id: number;
  name: string;
  type: "bank_transfer" | "qris";
  account_number: string | null;
  account_name: string | null;
  qr_image_url: string | null;
  is_active: number;
};

export default function AdminPaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    name: "",
    type: "bank_transfer",
    accountNumber: "",
    accountName: "",
    qrImage: null as File | null,
    isActive: true
  });

  const loadMethods = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/payment-methods");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMethods(data.methods);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMethods();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("type", form.type);
      formData.append("accountNumber", form.accountNumber);
      formData.append("accountName", form.accountName);
      formData.append("isActive", String(form.isActive));
      if (form.qrImage) {
        formData.append("qrImage", form.qrImage);
      }

      const res = await fetch("/api/admin/payment-methods", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setIsModalOpen(false);
      setForm({ name: "", type: "bank_transfer", accountNumber: "", accountName: "", qrImage: null, isActive: true });
      loadMethods();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: number, currentStatus: number) => {
    try {
      const res = await fetch(`/api/admin/payment-methods/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: currentStatus ? 0 : 1 })
      });
      if (res.ok) loadMethods();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus metode pembayaran ini?")) return;
    try {
      const res = await fetch(`/api/admin/payment-methods/${id}`, { method: "DELETE" });
      if (res.ok) loadMethods();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AdminShell>
      <div className="p-6 xl:p-8 space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 text-sm font-bold mb-1">
              <CreditCard size={16} />
              Konfigurasi Pembayaran
            </div>
            <h1 className="text-3xl font-black text-slate-900">Metode Pembayaran Client</h1>
            <p className="mt-1 text-sm text-slate-500">
              Atur rekening bank atau QRIS yang akan ditampilkan kepada klien saat membayar langganan.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition"
          >
            <Plus size={16} /> Tambah Baru
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
        ) : error ? (
          <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {methods.map((method) => (
              <div key={method.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={clsx("size-10 rounded-xl flex items-center justify-center", method.type === "qris" ? "bg-sky-100 text-sky-600" : "bg-emerald-100 text-emerald-600")}>
                      {method.type === "qris" ? <ImageIcon size={20} /> : <CreditCard size={20} />}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{method.name}</h3>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{method.type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive(method.id, method.is_active)}
                    className={clsx("px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider", method.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}
                  >
                    {method.is_active ? "Aktif" : "Nonaktif"}
                  </button>
                </div>
                
                <div className="space-y-2 mb-6">
                  {method.type === "bank_transfer" && (
                    <>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-500 font-semibold mb-1">No. Rekening</p>
                        <p className="font-black text-slate-900 text-lg tracking-widest">{method.account_number}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-500 font-semibold mb-1">Atas Nama</p>
                        <p className="font-bold text-slate-700">{method.account_name}</p>
                      </div>
                    </>
                  )}
                  {method.type === "qris" && method.qr_image_url && (
                    <div className="bg-slate-50 rounded-xl p-3 flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={method.qr_image_url} alt="QRIS" className="w-32 h-32 object-contain rounded-xl" />
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-100">
                  <button onClick={() => handleDelete(method.id)} className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition ml-auto">
                    <Trash2 size={14} /> Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-black text-slate-900 mb-6">Tambah Metode Pembayaran</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">Nama Metode (Cth: BCA, QRIS Gopay)</label>
                <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2" />
              </div>
              
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">Tipe</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value as any})} className="w-full rounded-xl border border-slate-200 px-4 py-2">
                  <option value="bank_transfer">Transfer Bank</option>
                  <option value="qris">QRIS</option>
                </select>
              </div>

              {form.type === "bank_transfer" ? (
                <>
                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-1">Nomor Rekening</label>
                    <input required type="text" value={form.accountNumber} onChange={e => setForm({...form, accountNumber: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-1">Atas Nama</label>
                    <input required type="text" value={form.accountName} onChange={e => setForm({...form, accountName: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2" />
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1">Upload QRIS Image</label>
                  <input required type="file" accept="image/*" onChange={e => setForm({...form, qrImage: e.target.files?.[0] || null})} className="w-full rounded-xl border border-slate-200 px-4 py-2" />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-xl border border-slate-200 py-3 font-bold text-slate-700 hover:bg-slate-50">Batal</button>
                <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
