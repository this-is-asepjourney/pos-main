"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getTransactions } from "@/services/transaction-service";
import type { PosTransaction } from "@/types/pos";
import { Receipt, Download, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<PosTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportError, setExportError] = useState("");

  const fetchTransactions = async () => {
    try {
      const data = await getTransactions(50);
      setTransactions(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    // polling setiap 30 detik
    const interval = setInterval(fetchTransactions, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleExport = async () => {
    setExportError("");
    try {
      const res = await fetch("/api/transactions/export");
      if (!res.ok) {
        const errorData = await res.json();
        setExportError(errorData.error || "Gagal mengunduh Excel.");
        return;
      }
      // Trigger file download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Transaksi_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setExportError("Gagal terhubung ke server.");
    }
  };

  return (
    <AppShell allowedRoles={["owner", "admin"]}>
      <div className="p-4 lg:p-8">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              Riwayat Transaksi
            </h1>
            <p className="mt-1 text-slate-500">
              Daftar transaksi dari semua kasir
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition shadow-sm"
            >
              <Download size={16} /> Export Excel
            </button>
            <button
              onClick={fetchTransactions}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 transition"
            >
              Refresh Data
            </button>
          </div>
        </header>

        {exportError && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4">
            <AlertTriangle className="text-amber-500" size={20} />
            <div>
              <p className="font-bold text-amber-800">Akses Ditolak</p>
              <p className="text-sm text-amber-700">{exportError}</p>
            </div>
            <a href="/subscription" className="ml-auto flex-shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black uppercase text-white hover:bg-amber-600 transition">
              Upgrade Plan
            </a>
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-6 py-4 font-bold">Invoice</th>
                  <th className="whitespace-nowrap px-6 py-4 font-bold">Waktu</th>
                  <th className="whitespace-nowrap px-6 py-4 font-bold">Kasir</th>
                  <th className="whitespace-nowrap px-6 py-4 font-bold">Metode</th>
                  <th className="whitespace-nowrap px-6 py-4 text-right font-bold">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      Memuat data...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <Receipt className="mx-auto mb-3 text-slate-300" size={48} />
                      <p className="font-semibold text-slate-500">Belum ada transaksi</p>
                    </td>
                  </tr>
                ) : (
                  transactions.map((trx) => (
                    <tr key={trx.id} className="transition hover:bg-slate-50">
                      <td className="px-6 py-4 font-bold text-slate-950">
                        {trx.invoiceCode}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                        {formatDateTime(trx.createdAt)}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700">
                        {trx.userName}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={clsx(
                            "rounded-full px-3 py-1 text-xs font-bold uppercase",
                            trx.paymentMethod === "cash"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-blue-50 text-blue-700",
                          )}
                        >
                          {trx.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-950">
                        {formatCurrency(trx.totalPrice)}
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
