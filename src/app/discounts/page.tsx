"use client";

import { useEffect, useState, FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { Sparkles, Ticket, LoaderCircle, CheckCircle2, Trash2, Plus, Percent } from "lucide-react";
import { useAuth } from "@/components/app-provider";

export default function DiscountsPage() {
  const { tenantId } = useAuth();
  const [tab, setTab] = useState<"RULES" | "VOUCHERS">("RULES");
  
  const [rules, setRules] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Rule form
  const [ruleName, setRuleName] = useState("");
  const [ruleCondition, setRuleCondition] = useState("MIN_SUBTOTAL");
  const [ruleCondValue, setRuleCondValue] = useState("");
  const [ruleType, setRuleType] = useState("PERCENTAGE");
  const [ruleValue, setRuleValue] = useState("");
  const [rulePriority, setRulePriority] = useState("0");
  const [ruleAllowStack, setRuleAllowStack] = useState(true);

  // Voucher form
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherMinAmount, setVoucherMinAmount] = useState("");
  const [voucherLimit, setVoucherLimit] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rRes, vRes] = await Promise.all([
        fetch("/api/discounts/rules"),
        fetch("/api/discounts/vouchers")
      ]);
      setRules(await rRes.json());
      setVouchers(await vRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) fetchData();
  }, [tenantId]);

  const handleCreateRule = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/discounts/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ruleName,
          conditionType: ruleCondition,
          conditionValue: ruleCondValue || null,
          discountType: ruleType,
          value: Number(ruleValue),
          priority: Number(rulePriority),
          allowStack: ruleAllowStack
        })
      });
      setIsFormOpen(false);
      fetchData();
    } catch (e) {
      alert("Gagal menyimpan rule");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateVoucher = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/discounts/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: voucherCode,
          minTransactionAmount: Number(voucherMinAmount),
          usageLimit: voucherLimit ? Number(voucherLimit) : null,
          discountType: ruleType,
          value: Number(ruleValue)
        })
      });
      setIsFormOpen(false);
      fetchData();
    } catch (e) {
      alert("Gagal menyimpan voucher");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, type: "rules" | "vouchers") => {
    if (!confirm("Hapus item ini?")) return;
    try {
      await fetch(`/api/discounts/${type}/${id}`, { method: "DELETE" });
      fetchData();
    } catch (e) {
      alert("Gagal menghapus");
    }
  };

  if (loading && rules.length === 0 && vouchers.length === 0) {
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
      <div className="grid gap-6 p-4 xl:p-6 max-w-6xl mx-auto">
        <div className="rounded-[2rem] bg-gradient-to-r from-violet-600 to-fuchsia-600 p-6 text-white shadow-xl flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-violet-200">
              <Sparkles size={17} />
              Pricing Engine
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Aturan Diskon & Voucher</h1>
          </div>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="bg-white text-violet-950 px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-violet-50 transition shadow-lg"
          >
            <Plus size={20} />
            Buat {tab === "RULES" ? "Rule" : "Voucher"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-2 bg-slate-200/50 rounded-3xl w-max">
          <button
            onClick={() => setTab("RULES")}
            className={`px-6 py-2 rounded-2xl font-bold flex items-center gap-2 transition ${tab === "RULES" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            <Sparkles size={18} /> Automatic Rules
          </button>
          <button
            onClick={() => setTab("VOUCHERS")}
            className={`px-6 py-2 rounded-2xl font-bold flex items-center gap-2 transition ${tab === "VOUCHERS" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            <Ticket size={18} /> Vouchers
          </button>
        </div>

        {/* Content */}
        {tab === "RULES" && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rules.map(r => (
              <div key={r.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => handleDelete(r.id, "rules")} className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl">
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="inline-flex px-3 py-1 bg-violet-100 text-violet-700 rounded-lg text-xs font-bold tracking-wide mb-3">
                  PRIORITY: {r.priority}
                </div>
                <h3 className="font-black text-xl mb-1">{r.name}</h3>
                <p className="text-slate-500 text-sm mb-4">
                  Condition: {r.conditionType} {r.conditionValue && `(${r.conditionValue})`}
                </p>
                <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                  <div>
                    <p className="text-xs font-bold text-slate-400 mb-1">DISCOUNT</p>
                    <p className="text-2xl font-black text-emerald-600">
                      {r.discountType === "PERCENTAGE" ? `${r.value}%` : `Rp${r.value.toLocaleString()}`}
                    </p>
                  </div>
                  {!r.allowStack && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-md font-bold">No Stack</span>
                  )}
                </div>
              </div>
            ))}
            {rules.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 font-medium">
                Belum ada automatic rule yang dibuat.
              </div>
            )}
          </div>
        )}

        {tab === "VOUCHERS" && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vouchers.map(v => (
              <div key={v.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => handleDelete(v.id, "vouchers")} className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl">
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="inline-flex px-3 py-1 bg-fuchsia-100 text-fuchsia-700 rounded-lg text-xs font-bold tracking-wide mb-3 uppercase">
                  {v.code}
                </div>
                <div className="mb-4">
                  <p className="text-slate-500 text-sm">
                    Min. Trx: Rp{v.minTransactionAmount.toLocaleString()}
                  </p>
                  <p className="text-slate-500 text-sm">
                    Usage: {v.usedCount} / {v.usageLimit || '∞'}
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-400 mb-1">DISCOUNT</p>
                  <p className="text-2xl font-black text-emerald-600">
                    {v.discountType === "PERCENTAGE" ? `${v.value}%` : `Rp${v.value.toLocaleString()}`}
                  </p>
                </div>
              </div>
            ))}
            {vouchers.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 font-medium">
                Belum ada voucher yang dibuat.
              </div>
            )}
          </div>
        )}

        {/* Modal Form */}
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-2xl font-black">Buat {tab === "RULES" ? "Automatic Rule" : "Voucher"}</h2>
                <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 p-2">✕</button>
              </div>
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {tab === "RULES" ? (
                  <form id="ruleForm" onSubmit={handleCreateRule} className="space-y-4">
                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-2">Nama Rule</label>
                      <input required value={ruleName} onChange={e=>setRuleName(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-violet-300" placeholder="e.g. Promo Akhir Pekan" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-bold text-slate-700 block mb-2">Kondisi</label>
                        <select value={ruleCondition} onChange={e=>setRuleCondition(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-violet-300">
                          <option value="NONE">Tanpa Syarat</option>
                          <option value="MIN_SUBTOTAL">Min. Subtotal</option>
                          <option value="MIN_QTY">Min. Qty Items</option>
                          <option value="TIME">Jam Tertentu</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-700 block mb-2">Nilai Kondisi</label>
                        <input value={ruleCondValue} onChange={e=>setRuleCondValue(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-violet-300" placeholder={ruleCondition === 'MIN_SUBTOTAL' ? '50000' : 'e.g. {"start":17,"end":20}'} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-bold text-slate-700 block mb-2">Tipe Diskon</label>
                        <select value={ruleType} onChange={e=>setRuleType(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-violet-300">
                          <option value="PERCENTAGE">Persen (%)</option>
                          <option value="FIXED">Nominal (Rp)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-700 block mb-2">Besaran Diskon</label>
                        <input type="number" required value={ruleValue} onChange={e=>setRuleValue(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-violet-300" placeholder="10" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-bold text-slate-700 block mb-2">Prioritas (Makin besar = dieksekusi duluan)</label>
                        <input type="number" value={rulePriority} onChange={e=>setRulePriority(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-violet-300" />
                      </div>
                      <div className="flex items-center gap-3 mt-8">
                        <input type="checkbox" checked={ruleAllowStack} onChange={e=>setRuleAllowStack(e.target.checked)} className="w-5 h-5 rounded" />
                        <label className="text-sm font-bold text-slate-700 block">Bisa digabung (Stack)?</label>
                      </div>
                    </div>
                  </form>
                ) : (
                  <form id="voucherForm" onSubmit={handleCreateVoucher} className="space-y-4">
                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-2">Kode Voucher</label>
                      <input required value={voucherCode} onChange={e=>setVoucherCode(e.target.value.toUpperCase())} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-fuchsia-300 uppercase" placeholder="MERDEKA99" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-bold text-slate-700 block mb-2">Tipe Diskon</label>
                        <select value={ruleType} onChange={e=>setRuleType(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-fuchsia-300">
                          <option value="PERCENTAGE">Persen (%)</option>
                          <option value="FIXED">Nominal (Rp)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-700 block mb-2">Besaran Diskon</label>
                        <input type="number" required value={ruleValue} onChange={e=>setRuleValue(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-fuchsia-300" placeholder="10" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-bold text-slate-700 block mb-2">Min. Transaksi (Rp)</label>
                        <input type="number" value={voucherMinAmount} onChange={e=>setVoucherMinAmount(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-fuchsia-300" placeholder="0" />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-700 block mb-2">Limit Penggunaan</label>
                        <input type="number" value={voucherLimit} onChange={e=>setVoucherLimit(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-fuchsia-300" placeholder="Kosongkan jika unlimited" />
                      </div>
                    </div>
                  </form>
                )}
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-3 rounded-2xl font-bold text-slate-600 hover:bg-slate-200 transition">Batal</button>
                <button type="submit" form={tab === "RULES" ? "ruleForm" : "voucherForm"} disabled={saving} className="px-6 py-3 rounded-2xl font-bold text-white bg-slate-900 hover:bg-slate-800 transition flex items-center gap-2">
                  {saving && <LoaderCircle size={18} className="animate-spin" />}
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
