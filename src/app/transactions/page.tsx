"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getTransactions } from "@/services/transaction-service";
import type { PosTransaction } from "@/types/pos";
import { Receipt } from "lucide-react";
import { clsx } from "clsx";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<PosTransaction[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <AppShell allowedRoles={["owner", "admin"]}>
      <div className="p-4 lg:p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              Riwayat Transaksi
            </h1>
            <p className="mt-1 text-slate-500">
              Daftar transaksi dari semua kasir
            </p>
          </div>
          <button
            onClick={fetchTransactions}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200"
          >
            Refresh Data
          </button>
        </header>

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
