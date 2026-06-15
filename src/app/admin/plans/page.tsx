"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { getAdminPlans, deleteAdminPlan, updateAdminPlan, createAdminPlan } from "@/services/admin-service";
import type { AdminPlan } from "@/types/pos";
import { formatCurrency } from "@/lib/format";
import { CheckCircle2, PencilLine, Plus, Trash2 } from "lucide-react";

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdminPlan>>({});
  const [isCreating, setIsCreating] = useState(false);

  const fetchData = async () => {
    try {
      const data = await getAdminPlans();
      setPlans(data);
    } catch (error) {
      console.error("Failed to fetch plans:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus plan ini?")) return;
    try {
      await deleteAdminPlan(id);
      fetchData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal menghapus plan");
    }
  };

  const handleEdit = (plan: AdminPlan) => {
    setEditingId(plan.id);
    setEditForm(plan);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setEditingId("new");
    setIsCreating(true);
    setEditForm({
      id: "",
      name: "",
      priceIdr: 0,
      billingInterval: "monthly",
      maxBranches: 1,
      maxProducts: 100,
      maxUsers: 3,
      transactionsPerMonth: 1000,
      featureMultiBranch: false,
      featureAdvancedReports: false,
      featureExcelExport: false,
      featureApiAccess: false,
      featureLoyalty: false,
      isActive: true,
    });
  };

  const saveEdit = async () => {
    try {
      if (isCreating) {
        await createAdminPlan(editForm);
      } else if (editingId) {
        await updateAdminPlan(editingId, editForm);
      }
      setEditingId(null);
      fetchData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal menyimpan plan");
    }
  };

  return (
    <AdminShell>
      <div className="p-6 xl:p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Subscription Plans</h1>
            <p className="mt-1 text-sm text-slate-500">Definisi harga dan fitur paket langganan tenant.</p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 transition"
          >
            <Plus size={16} />
            Buat Plan
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
          {loading ? (
            <div className="text-sm font-semibold text-slate-500">Loading plans...</div>
          ) : (
            <>
              {editingId === "new" && (
                <PlanEditor 
                  form={editForm} 
                  setForm={setEditForm} 
                  onSave={saveEdit} 
                  onCancel={() => setEditingId(null)} 
                  isNew 
                />
              )}
              {plans.map((plan) => (
                editingId === plan.id ? (
                  <PlanEditor 
                    key={plan.id}
                    form={editForm} 
                    setForm={setEditForm} 
                    onSave={saveEdit} 
                    onCancel={() => setEditingId(null)} 
                  />
                ) : (
                  <div key={plan.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-2xl font-black text-slate-900">{plan.name}</h2>
                        <p className="text-sm font-mono text-slate-400">{plan.id}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${plan.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="mb-6">
                      <span className="text-3xl font-black text-slate-900">{formatCurrency(plan.priceIdr)}</span>
                      <span className="text-slate-500 text-sm font-medium">/{plan.billingInterval}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm text-slate-700 mb-6 flex-1">
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Limits</p>
                        <ul className="space-y-2 font-medium">
                          <li>• {plan.maxBranches} Cabang</li>
                          <li>• {plan.maxUsers} Users</li>
                          <li>• {plan.maxProducts} Produk</li>
                          <li>• {plan.transactionsPerMonth} Transaksi/bln</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Fitur Premium</p>
                        <ul className="space-y-2 font-medium">
                          {plan.featureMultiBranch && <li className="text-emerald-600">✓ Multi Branch</li>}
                          {plan.featureAdvancedReports && <li className="text-emerald-600">✓ Advanced Reports</li>}
                          {plan.featureExcelExport && <li className="text-emerald-600">✓ Excel Export</li>}
                          {plan.featureApiAccess && <li className="text-emerald-600">✓ API Access</li>}
                          {plan.featureLoyalty && <li className="text-emerald-600">✓ Loyalty Program</li>}
                          {!plan.featureMultiBranch && !plan.featureAdvancedReports && !plan.featureExcelExport && !plan.featureApiAccess && !plan.featureLoyalty && (
                            <li className="text-slate-400 italic">Tidak ada fitur ekstra</li>
                          )}
                        </ul>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-slate-100">
                      <button onClick={() => handleEdit(plan)} className="flex-1 justify-center flex items-center gap-2 rounded-xl bg-slate-100 p-2 text-sm font-bold text-slate-700 hover:bg-slate-200">
                        <PencilLine size={16} /> Edit
                      </button>
                      <button onClick={() => handleDelete(plan.id)} className="rounded-xl bg-rose-50 p-2 text-rose-600 hover:bg-rose-100">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )
              ))}
            </>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

function PlanEditor({ form, setForm, onSave, onCancel, isNew = false }: any) {
  return (
    <div className="rounded-3xl border-2 border-emerald-200 bg-white p-6 shadow-lg shadow-emerald-900/5 flex flex-col relative">
      <div className="space-y-4 flex-1">
        <div className="grid grid-cols-2 gap-3">
          {isNew && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">ID (Slug)</label>
              <input value={form.id || ""} onChange={e => setForm({...form, id: e.target.value})} className="w-full rounded-xl border border-slate-200 p-2 text-sm outline-none" placeholder="e.g. basic-plan" />
            </div>
          )}
          <div className={isNew ? "" : "col-span-2"}>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Nama Plan</label>
            <input value={form.name || ""} onChange={e => setForm({...form, name: e.target.value})} className="w-full rounded-xl border border-slate-200 p-2 text-sm outline-none font-black" placeholder="Nama Plan" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Harga (IDR)</label>
            <input type="number" value={form.priceIdr || 0} onChange={e => setForm({...form, priceIdr: Number(e.target.value)})} className="w-full rounded-xl border border-slate-200 p-2 text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Interval</label>
            <select value={form.billingInterval || "monthly"} onChange={e => setForm({...form, billingInterval: e.target.value})} className="w-full rounded-xl border border-slate-200 p-2 text-sm outline-none">
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Max Branches</label>
            <input type="number" value={form.maxBranches || 0} onChange={e => setForm({...form, maxBranches: Number(e.target.value)})} className="w-full rounded-xl border border-slate-200 p-2 text-sm outline-none" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Max Users</label>
            <input type="number" value={form.maxUsers || 0} onChange={e => setForm({...form, maxUsers: Number(e.target.value)})} className="w-full rounded-xl border border-slate-200 p-2 text-sm outline-none" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Max Products</label>
            <input type="number" value={form.maxProducts || 0} onChange={e => setForm({...form, maxProducts: Number(e.target.value)})} className="w-full rounded-xl border border-slate-200 p-2 text-sm outline-none" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Tx / Bulan</label>
            <input type="number" value={form.transactionsPerMonth || 0} onChange={e => setForm({...form, transactionsPerMonth: Number(e.target.value)})} className="w-full rounded-xl border border-slate-200 p-2 text-sm outline-none" />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input type="checkbox" checked={form.featureMultiBranch} onChange={e => setForm({...form, featureMultiBranch: e.target.checked})} className="rounded border-slate-300 text-emerald-600" />
            Multi Branch
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input type="checkbox" checked={form.featureAdvancedReports} onChange={e => setForm({...form, featureAdvancedReports: e.target.checked})} className="rounded border-slate-300 text-emerald-600" />
            Adv. Reports
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input type="checkbox" checked={form.featureExcelExport} onChange={e => setForm({...form, featureExcelExport: e.target.checked})} className="rounded border-slate-300 text-emerald-600" />
            Excel Export
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input type="checkbox" checked={form.featureApiAccess} onChange={e => setForm({...form, featureApiAccess: e.target.checked})} className="rounded border-slate-300 text-emerald-600" />
            API Access
          </label>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <label className="flex items-center gap-2 text-sm font-black cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} className="rounded border-slate-300 text-emerald-600" />
            Plan is Active
          </label>
        </div>
      </div>

      <div className="flex gap-2 pt-4 mt-4 border-t border-slate-100">
        <button onClick={onSave} className="flex-1 justify-center flex items-center gap-2 rounded-xl bg-emerald-600 p-2 text-sm font-bold text-white hover:bg-emerald-700">
          <CheckCircle2 size={16} /> Simpan
        </button>
        <button onClick={onCancel} className="rounded-xl bg-slate-100 p-2 px-4 text-sm font-bold text-slate-700 hover:bg-slate-200">
          Batal
        </button>
      </div>
    </div>
  );
}
