"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, Download, PencilLine, ReceiptText, Save, Search, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { formatCurrency, formatDateTime, formatShortDate, toDate } from "@/lib/format";
import { subscribeTransactions, updateTransaction } from "@/services/transaction-service";
import type { PaymentMethod, PosTransaction, TransactionUpdateInput } from "@/types/pos";

const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "qris", label: "QRIS" },
  { value: "debit", label: "Debit" },
];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<PosTransaction[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editForm, setEditForm] = useState<TransactionUpdateInput>({
    paidAmount: 0,
    paymentMethod: "cash",
  });

  useEffect(() => subscribeTransactions(setTransactions, 100), []);

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) =>
        `${transaction.invoiceCode} ${transaction.userName} ${transaction.paymentMethod}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [query, transactions],
  );

  const activeTransaction =
    transactions.find((transaction) => transaction.id === selectedId) ??
    filteredTransactions[0] ??
    null;
  const totalRevenue = filteredTransactions.reduce(
    (sum, transaction) => sum + transaction.totalPrice,
    0,
  );

  const startEdit = () => {
    if (!activeTransaction) return;

    setEditForm({
      paidAmount: activeTransaction.paidAmount,
      paymentMethod: activeTransaction.paymentMethod,
    });
    setMessage("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setMessage("");
  };

  const handleUpdateTransaction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeTransaction) return;

    setSaving(true);
    setMessage("");

    try {
      await updateTransaction(activeTransaction.id, editForm);
      setMessage("Transaksi berhasil diperbarui.");
      setEditing(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Transaksi gagal diperbarui.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportTransactions = async () => {
    if (!filteredTransactions.length) {
      setMessage("Tidak ada transaksi untuk diexport.");
      return;
    }

    const xlsx = await import("xlsx");
    const exportedAt = new Date();
    const summaryRows = filteredTransactions.map((transaction) => ({
      INVOICE: transaction.invoiceCode,
      KASIR: transaction.userName,
      WAKTU: toDate(transaction.createdAt),
      METODE: transaction.paymentMethod.toUpperCase(),
      ITEM: transaction.items.reduce((sum, item) => sum + item.qty, 0),
      HARI_SEWA: transaction.rentalDays ?? "",
      TGL_AMBIL: transaction.pickupDate ?? "",
      TGL_KEMBALI_RENCANA: transaction.returnDueDate ?? "",
      TGL_KEMBALI_AKTUAL: transaction.actualReturnDate ?? "",
      ID_JENIS: transaction.renterIdType ?? "",
      ID_NOMOR: transaction.renterIdNumber ?? "",
      HARI_TERLAMBAT: transaction.lateDays ?? 0,
      DENDA: transaction.lateFeeAmount ?? 0,
      HARI1_SUBTOTAL: transaction.firstDaySubtotal ?? "",
      TAMBAHAN_HARI: transaction.multiDayExtraAmount ?? "",
      SUBTOTAL_SBLM_LIBUR: transaction.rentalSubtotalBeforeHoliday ?? "",
      PENGALI_LIBUR: transaction.holidayMultiplier ?? "",
      TOTAL_SEWA: transaction.baseTotalPrice ?? transaction.totalPrice,
      TOTAL_AKHIR: transaction.totalPrice,
      DIBAYAR: transaction.paidAmount,
      KEMBALIAN: transaction.changeAmount,
    }));
    const detailRows = filteredTransactions.flatMap((transaction) =>
      transaction.items.map((item) => ({
        INVOICE: transaction.invoiceCode,
        WAKTU: toDate(transaction.createdAt),
        KASIR: transaction.userName,
        METODE: transaction.paymentMethod.toUpperCase(),
        ALAT: item.name,
        SPESIFIKASI: item.specification ?? "",
        KETERANGAN: item.notes ?? "",
        QTY: item.qty,
        TARIF_HARI1: item.price,
        SUBTOTAL: item.subtotal,
      })),
    );

    const summarySheet = xlsx.utils.json_to_sheet(summaryRows);
    const detailSheet = xlsx.utils.json_to_sheet(detailRows);

    summarySheet["!cols"] = [
      { wch: 20 },
      { wch: 22 },
      { wch: 20 },
      { wch: 10 },
      { wch: 8 },
      { wch: 12 },
      { wch: 16 },
      { wch: 16 },
      { wch: 8 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
    ];
    detailSheet["!cols"] = [
      { wch: 22 },
      { wch: 20 },
      { wch: 24 },
      { wch: 12 },
      { wch: 28 },
      { wch: 24 },
      { wch: 24 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
    ];

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, summarySheet, "Ringkasan Transaksi");
    xlsx.utils.book_append_sheet(workbook, detailSheet, "Detail Item");
    xlsx.writeFile(
      workbook,
      `rekap-transaksi-bro-pos-${exportedAt.toISOString().slice(0, 10)}.xlsx`,
    );
  };

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="grid gap-6 p-4 xl:grid-cols-[1fr_420px] xl:p-6">
        <section className="space-y-5">
          <header className="rounded-[2rem] bg-white p-6 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-cyan-700">
              <CalendarDays size={17} />
              History
            </p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-slate-950">Riwayat transaksi</h1>
                <p className="mt-2 max-w-2xl text-slate-500">
                  Audit invoice, metode pembayaran, item transaksi, dan nilai penjualan.
                </p>
              </div>
              <div className="rounded-3xl bg-slate-950 p-4 text-white">
                <p className="text-xs text-slate-400">Total tampil</p>
                <p className="mt-1 text-2xl font-black">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </header>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-950">Daftar invoice</h2>
                <p className="text-sm text-slate-500">{filteredTransactions.length} transaksi</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleExportTransactions}
                  disabled={!filteredTransactions.length}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={17} />
                  Export Excel
                </button>
                <label className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cari invoice / kasir..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 outline-none focus:border-cyan-300 lg:w-80"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-3 md:hidden">
              {filteredTransactions.map((transaction) => (
                <button
                  key={transaction.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(transaction.id);
                    setEditing(false);
                    setMessage("");
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">{transaction.invoiceCode}</p>
                      <p className="text-xs font-semibold text-slate-500">{transaction.userName}</p>
                    </div>
                    <p className="text-sm font-black text-slate-950">
                      {formatCurrency(transaction.totalPrice)}
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
                    <p>{formatDateTime(transaction.createdAt)}</p>
                    <p className="text-right uppercase">{transaction.paymentMethod}</p>
                    <p className="col-span-2">
                      {transaction.items.reduce((sum, item) => sum + item.qty, 0)} item
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="py-3">Invoice</th>
                    <th>Kasir</th>
                    <th>Waktu</th>
                    <th>Metode</th>
                    <th>Item</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      onClick={() => {
                        setSelectedId(transaction.id);
                        setEditing(false);
                        setMessage("");
                      }}
                      className="cursor-pointer font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <td className="py-4 font-black text-slate-950">{transaction.invoiceCode}</td>
                      <td>{transaction.userName}</td>
                      <td>{formatDateTime(transaction.createdAt)}</td>
                      <td className="uppercase">{transaction.paymentMethod}</td>
                      <td>{transaction.items.reduce((sum, item) => sum + item.qty, 0)}</td>
                      <td className="text-right font-black text-slate-950">
                        {formatCurrency(transaction.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>

        <aside className="xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)]">
          <section className="flex h-full flex-col rounded-[2rem] bg-slate-950 p-5 text-white shadow-2xl shadow-slate-950/20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">Detail invoice</p>
                <h2 className="text-2xl font-black tracking-tight">
                  {activeTransaction?.invoiceCode ?? "Belum ada transaksi"}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {activeTransaction && !editing ? (
                  <button
                    type="button"
                    onClick={startEdit}
                    className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-sm font-bold text-slate-100 transition hover:bg-white/15"
                  >
                    <PencilLine size={15} />
                    Edit
                  </button>
                ) : null}
                <span className="flex size-12 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950">
                  <ReceiptText size={23} />
                </span>
              </div>
            </div>

            {activeTransaction ? (
              <>
                {message ? (
                  <div className="mt-5 rounded-2xl bg-cyan-400/10 p-3 text-sm font-semibold text-cyan-100">
                    {message}
                  </div>
                ) : null}

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-3xl bg-white/10 p-4">
                    <p className="text-xs text-slate-400">Kasir</p>
                    <p className="mt-2 font-bold">{activeTransaction.userName}</p>
                  </div>
                  <div className="rounded-3xl bg-white/10 p-4">
                    <p className="text-xs text-slate-400">Metode</p>
                    <p className="mt-2 font-bold uppercase">{activeTransaction.paymentMethod}</p>
                  </div>
                  <div className="rounded-3xl bg-white/10 p-4">
                    <p className="text-xs text-slate-400">Lama sewa</p>
                    <p className="mt-2 font-bold">{activeTransaction.rentalDays ?? "—"} hari</p>
                  </div>
                  <div className="rounded-3xl bg-white/10 p-4">
                    <p className="text-xs text-slate-400">Hari terlambat</p>
                    <p className="mt-2 font-bold">{activeTransaction.lateDays ?? 0} hari</p>
                  </div>
                  {activeTransaction.pickupDate ? (
                    <div className="rounded-3xl bg-white/10 p-4">
                      <p className="text-xs text-slate-400">Ambil</p>
                      <p className="mt-2 font-bold">{formatShortDate(activeTransaction.pickupDate)}</p>
                    </div>
                  ) : null}
                  {activeTransaction.returnDueDate ? (
                    <div className="rounded-3xl bg-white/10 p-4">
                      <p className="text-xs text-slate-400">Rencana kembali</p>
                      <p className="mt-2 font-bold">{formatShortDate(activeTransaction.returnDueDate)}</p>
                    </div>
                  ) : null}
                  {activeTransaction.actualReturnDate ? (
                    <div className="rounded-3xl bg-white/10 p-4">
                      <p className="text-xs text-slate-400">Kembali aktual</p>
                      <p className="mt-2 font-bold">{formatShortDate(activeTransaction.actualReturnDate)}</p>
                    </div>
                  ) : null}
                  {activeTransaction.renterIdType || activeTransaction.renterIdNumber ? (
                    <div className="col-span-2 rounded-3xl bg-white/10 p-4">
                      <p className="text-xs text-slate-400">Identitas penyewa</p>
                      <p className="mt-2 font-bold uppercase">
                        {activeTransaction.renterIdType ?? "—"} · {activeTransaction.renterIdNumber ?? "—"}
                      </p>
                    </div>
                  ) : null}
                  <div className="rounded-3xl bg-white/10 p-4">
                    <p className="text-xs text-slate-400">Denda</p>
                    <p className="mt-2 font-bold">{formatCurrency(activeTransaction.lateFeeAmount ?? 0)}</p>
                  </div>
                  {activeTransaction.yearEndHolidayApplied ? (
                    <div className="rounded-3xl bg-amber-400/15 p-4">
                      <p className="text-xs text-amber-200/90">Pengali 28–31 Des</p>
                      <p className="mt-2 font-bold text-amber-100">
                        ×{activeTransaction.holidayMultiplier ?? 1}
                      </p>
                    </div>
                  ) : null}
                </div>

                {editing ? (
                  <form
                    onSubmit={handleUpdateTransaction}
                    className="mt-5 space-y-4 rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-4"
                  >
                    <div>
                      <p className="text-sm font-black text-cyan-100">Edit transaksi</p>
                      <p className="mt-1 text-xs text-cyan-100/75">
                        Admin dapat mengubah metode pembayaran dan nominal dibayar.
                      </p>
                    </div>

                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-100/80">
                        Metode pembayaran
                      </span>
                      <select
                        value={editForm.paymentMethod}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            paymentMethod: event.target.value as PaymentMethod,
                          }))
                        }
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-bold text-white outline-none focus:border-cyan-300"
                      >
                        {paymentMethods.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-100/80">
                        Nominal dibayar
                      </span>
                      <input
                        type="number"
                        min={activeTransaction.totalPrice}
                        value={editForm.paidAmount || ""}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            paidAmount: Number(event.target.value),
                          }))
                        }
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 font-bold text-white outline-none focus:border-cyan-300"
                        required
                      />
                      <p className="mt-2 text-xs font-semibold text-cyan-100/70">
                        Minimal {formatCurrency(activeTransaction.totalPrice)}
                      </p>
                    </label>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 font-black text-slate-950 disabled:opacity-60"
                      >
                        <Save size={16} />
                        {saving ? "Menyimpan..." : "Simpan"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 font-bold text-slate-100"
                      >
                        <X size={16} />
                        Batal
                      </button>
                    </div>
                  </form>
                ) : null}

                <div className="mt-5 flex-1 space-y-3 overflow-y-auto">
                  {activeTransaction.items.map((item) => (
                    <div key={`${activeTransaction.id}-${item.productId}`} className="rounded-3xl bg-white/8 p-4">
                      <div className="flex justify-between gap-3">
                        <div>
                          <p className="font-bold">{item.name}</p>
                          {item.specification ? (
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                              {item.specification}
                            </p>
                          ) : null}
                          {item.notes ? (
                            <p className="text-xs text-slate-500">{item.notes}</p>
                          ) : null}
                          <p className="text-sm text-slate-400">
                            {item.qty} x {formatCurrency(item.price)}
                          </p>
                        </div>
                        <p className="font-black">{formatCurrency(item.subtotal)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-2 rounded-3xl bg-white p-4 text-slate-950">
                  {activeTransaction.firstDaySubtotal != null ? (
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Subtotal hari ke-1</span>
                      <span>{formatCurrency(activeTransaction.firstDaySubtotal)}</span>
                    </div>
                  ) : null}
                  {activeTransaction.multiDayExtraAmount != null ? (
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Tambahan hari sewa (2+)</span>
                      <span>{formatCurrency(activeTransaction.multiDayExtraAmount)}</span>
                    </div>
                  ) : null}
                  {activeTransaction.rentalSubtotalBeforeHoliday != null ? (
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Subtotal sebelum pengali libur</span>
                      <span>{formatCurrency(activeTransaction.rentalSubtotalBeforeHoliday)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Total sewa (sebelum denda)</span>
                    <span>
                      {formatCurrency(activeTransaction.baseTotalPrice ?? activeTransaction.totalPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Denda keterlambatan</span>
                    <span>{formatCurrency(activeTransaction.lateFeeAmount ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Total akhir</span>
                    <span>{formatCurrency(activeTransaction.totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Dibayar</span>
                    <span>{formatCurrency(activeTransaction.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-3 font-black">
                    <span>Kembalian</span>
                    <span className="text-cyan-700">{formatCurrency(activeTransaction.changeAmount)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-8 rounded-3xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">
                Transaksi akan tampil setelah checkout tersimpan.
              </div>
            )}
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
