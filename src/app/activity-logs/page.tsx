"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { formatDateTime } from "@/lib/format";
import { Activity, Search } from "lucide-react";
import { clsx } from "clsx";

type ActivityLog = {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  description: string;
  metadata: any;
  createdAt: string;
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/activity-logs?limit=200");
      if (!res.ok) throw new Error("Gagal memuat");
      const data = await res.json();
      setLogs(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      l.description.toLowerCase().includes(search.toLowerCase()) ||
      l.userName?.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell allowedRoles={["owner", "admin"]}>
      <div className="p-4 lg:p-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 flex items-center gap-2">
              <Activity className="text-indigo-500" size={28} />
              Log Aktivitas
            </h1>
            <p className="mt-1 text-slate-500">
              Pantau aktivitas sistem dan kasir secara real-time.
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari aktivitas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 rounded-2xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </header>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="whitespace-nowrap px-6 py-4 font-bold">Waktu</th>
                  <th className="whitespace-nowrap px-6 py-4 font-bold">Pengguna</th>
                  <th className="whitespace-nowrap px-6 py-4 font-bold">Aksi</th>
                  <th className="whitespace-nowrap px-6 py-4 font-bold">Deskripsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      Memuat data...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-16 text-center">
                      <Activity className="mx-auto mb-3 text-slate-300" size={48} />
                      <p className="font-semibold text-slate-500">Tidak ada log aktivitas</p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="transition hover:bg-slate-50">
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-500">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {log.userName || "Sistem"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={clsx(
                            "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider",
                            log.action === "CREATE_TRANSACTION"
                              ? "bg-emerald-100 text-emerald-700"
                              : log.action === "ADD_PRODUCT"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {log.description}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
