"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { MessageSquareWarning, Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { clsx } from "clsx";

type Feedback = {
  id: number;
  tenant_id: string;
  tenant_name: string;
  user_id: string;
  user_name: string;
  user_email: string;
  subject: string;
  message: string;
  status: "pending" | "investigating" | "resolved";
  created_at: string;
};

export default function AdminFeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/feedbacks");
      const data = await res.json();
      setFeedbacks(data.feedbacks || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/feedbacks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) loadData();
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
              <MessageSquareWarning size={16} />
              Laporan Klien
            </div>
            <h1 className="text-3xl font-black text-slate-900">Feedback & Kendala</h1>
            <p className="mt-1 text-sm text-slate-500">
              Pantau laporan bug, keluhan, atau masukan dari klien Anda.
            </p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((f) => (
              <div key={f.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={clsx("inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase", 
                        f.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                        f.status === 'investigating' ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700')}>
                        {f.status}
                      </span>
                      <span className="text-xs font-bold text-slate-400">{formatDateTime(f.created_at)}</span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900">{f.subject}</h3>
                    <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{f.message}</p>
                    
                    <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="font-semibold text-slate-500">Dari Tenant</p>
                        <p className="font-bold text-slate-900">{f.tenant_name}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-500">Dilaporkan Oleh</p>
                        <p className="font-bold text-slate-900">{f.user_name} ({f.user_email})</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex md:flex-col gap-2 shrink-0">
                    {f.status !== 'resolved' && (
                      <button 
                        onClick={() => handleUpdateStatus(f.id, 'resolved')}
                        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-200 transition"
                      >
                        <CheckCircle2 size={14} /> Tandai Selesai
                      </button>
                    )}
                    {f.status === 'pending' && (
                      <button 
                        onClick={() => handleUpdateStatus(f.id, 'investigating')}
                        className="flex items-center justify-center gap-2 rounded-xl bg-amber-100 px-4 py-2 text-xs font-bold text-amber-700 hover:bg-amber-200 transition"
                      >
                        Sedang Diproses
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {feedbacks.length === 0 && (
              <div className="p-10 text-center text-slate-500">Belum ada feedback / laporan masuk.</div>
            )}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
