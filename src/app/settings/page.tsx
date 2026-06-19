"use client";

import { useEffect, useState, FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { Save, Building2, LoaderCircle, CheckCircle2, Percent } from "lucide-react";
import { useAuth } from "@/components/app-provider";

export default function SettingsPage() {
  const { tenantId } = useAuth();
  const [taxRate, setTaxRate] = useState<number>(0);
  const [taxInclusive, setTaxInclusive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    fetch("/api/settings/tax")
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setTaxRate(data.taxRate || 0);
          setTaxInclusive(data.taxInclusive || false);
        }
      })
      .finally(() => setLoading(false));
  }, [tenantId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings/tax", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taxRate, taxInclusive })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: "success", text: "Pengaturan pajak berhasil disimpan!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Gagal menyimpan pengaturan" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppShell allowedRoles={["owner", "admin"]}>
        <div className="flex h-[50vh] items-center justify-center">
          <LoaderCircle className="animate-spin text-slate-400" size={32} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell allowedRoles={["owner", "admin"]}>
      <div className="grid gap-6 p-4 xl:p-6 max-w-4xl mx-auto">
        <section className="space-y-4">
          <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-cyan-200">
              <Building2 size={17} />
              Pengaturan Toko
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Pajak & Biaya</h1>
            <p className="mt-2 text-sm text-slate-300">
              Atur persentase pajak (misalnya PPN) yang berlaku untuk seluruh transaksi.
            </p>
          </div>

          {message && (
            <div className={`p-4 rounded-3xl font-semibold flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
              {message.type === 'success' ? <CheckCircle2 size={20} /> : <span className="text-xl">⚠️</span>}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-2">Persentase Pajak (%)</label>
                <div className="relative">
                  <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100 transition"
                    placeholder="Contoh: 11"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500 font-medium">Isi dengan 0 jika tidak ada pajak.</p>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 block mb-2">Sistem Kalkulasi Pajak</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`cursor-pointer flex flex-col p-4 rounded-2xl border-2 transition ${!taxInclusive ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                    <div className="flex items-center gap-3 mb-1">
                      <input 
                        type="radio" 
                        name="taxType" 
                        checked={!taxInclusive} 
                        onChange={() => setTaxInclusive(false)} 
                        className="w-4 h-4 text-cyan-600 focus:ring-cyan-500"
                      />
                      <span className="font-bold text-slate-900">Tax Exclusive</span>
                    </div>
                    <p className="text-xs text-slate-500 ml-7">Harga produk belum termasuk pajak. Pajak akan ditambahkan di akhir saat checkout.</p>
                  </label>
                  
                  <label className={`cursor-pointer flex flex-col p-4 rounded-2xl border-2 transition ${taxInclusive ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                    <div className="flex items-center gap-3 mb-1">
                      <input 
                        type="radio" 
                        name="taxType" 
                        checked={taxInclusive} 
                        onChange={() => setTaxInclusive(true)} 
                        className="w-4 h-4 text-cyan-600 focus:ring-cyan-500"
                      />
                      <span className="font-bold text-slate-900">Tax Inclusive</span>
                    </div>
                    <p className="text-xs text-slate-500 ml-7">Harga produk sudah termasuk pajak. Sistem akan menghitung mundur proporsi pajaknya.</p>
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 font-black text-white transition hover:bg-slate-800 disabled:opacity-70 min-w-[140px]"
              >
                {saving ? <LoaderCircle size={18} className="animate-spin" /> : <Save size={18} />}
                {saving ? "Menyimpan..." : "Simpan Pengaturan"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
