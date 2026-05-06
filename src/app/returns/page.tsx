"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarClock, Search, Undo2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { formatCurrency, formatDateTime, formatShortDate } from "@/lib/format";
import { lateDaysFromActualReturn } from "@/lib/rental";
import {
  processReturnTransaction,
  resolveRentalStatus,
  subscribeTransactions,
} from "@/services/transaction-service";
import type { PosTransaction } from "@/types/pos";

const toInputDate = (value: Date) => {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function ReturnsPage() {
  const [transactions, setTransactions] = useState<PosTransaction[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actualReturnDate, setActualReturnDate] = useState(toInputDate(new Date()));
  const [additionalPaidAmount, setAdditionalPaidAmount] = useState(0);
  const [returnCondition, setReturnCondition] = useState("");
  const [returnAccessories, setReturnAccessories] = useState("");
  const [returnPhotoNotes, setReturnPhotoNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => subscribeTransactions(setTransactions, 200), []);

  const pendingReturns = useMemo(
    () =>
      transactions.filter((trx) => {
        if (!trx.returnDueDate || trx.actualReturnDate) return false;
        const haystack = `${trx.invoiceCode} ${trx.userName} ${trx.renterIdNumber ?? ""}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      }),
    [transactions, query],
  );

  const active = pendingReturns.find((trx) => trx.id === selectedId) ?? pendingReturns[0] ?? null;

  const preview = useMemo(() => {
    if (!active || !active.returnDueDate || !actualReturnDate) return null;
    try {
      const lateDays = lateDaysFromActualReturn(active.returnDueDate, actualReturnDate);
      const baseTotalPrice =
        Number(active.baseTotalPrice ?? 0) ||
        Math.max(0, Number(active.totalPrice ?? 0) - Number(active.lateFeeAmount ?? 0));
      const currentLate = Number(active.lateFeeAmount ?? 0);
      const oldTotal = Number(active.totalPrice ?? 0);
      const paidBefore = Number(active.paidAmount ?? 0);
      const paidAfter = paidBefore + additionalPaidAmount;
      return {
        lateDays,
        baseTotalPrice,
        currentLate,
        oldTotal,
        paidBefore,
        paidAfter,
      };
    } catch {
      return null;
    }
  }, [active, actualReturnDate, additionalPaidAmount]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!active) return;

    setSaving(true);
    setMessage("");
    try {
      await processReturnTransaction(active.id, {
        actualReturnDate,
        additionalPaidAmount,
        returnChecklist: {
          condition: returnCondition.trim(),
          accessories: returnAccessories.trim(),
          photoNotes: returnPhotoNotes.trim(),
        },
      });
      setMessage(`Pengembalian ${active.invoiceCode} berhasil diproses.`);
      setAdditionalPaidAmount(0);
      setReturnCondition("");
      setReturnAccessories("");
      setReturnPhotoNotes("");
      setSelectedId(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memproses pengembalian.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell allowedRoles={["admin", "cashier"]}>
      <div className="grid gap-6 p-4 xl:grid-cols-[1fr_420px] xl:p-6">
        <section className="space-y-5">
          <header className="rounded-[2rem] bg-white p-6 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
              <Undo2 size={17} />
              Return
            </p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-slate-950">Transaksi pengembalian</h1>
                <p className="mt-2 max-w-2xl text-slate-500">
                  Proses barang kembali, hitung hari keterlambatan aktual, dan catat pembayaran tambahan jika ada.
                </p>
              </div>
              <div className="rounded-3xl bg-slate-950 p-4 text-white">
                <p className="text-xs text-slate-400">Menunggu kembali</p>
                <p className="mt-1 text-2xl font-black">{pendingReturns.length}</p>
              </div>
            </div>
          </header>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-950">Daftar sewa aktif</h2>
                <p className="text-sm text-slate-500">Hanya transaksi yang belum diproses kembali.</p>
              </div>
              <label className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari invoice / penyewa..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 outline-none focus:border-emerald-300 lg:w-80"
                />
              </label>
            </div>

            <div className="space-y-3">
              {pendingReturns.length ? (
                pendingReturns.map((trx) => (
                  <button
                    key={trx.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(trx.id);
                      setAdditionalPaidAmount(0);
                      setMessage("");
                    }}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      active?.id === trx.id
                        ? "border-emerald-300 bg-emerald-50/70"
                        : "border-slate-200 bg-slate-50 hover:border-emerald-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-950">{trx.invoiceCode}</p>
                        <p className="text-xs font-semibold text-slate-500">{trx.userName}</p>
                      </div>
                      <p className="text-sm font-black text-slate-950">{formatCurrency(trx.totalPrice)}</p>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
                      <p className="uppercase">
                        Status: {resolveRentalStatus(trx) === "overdue" ? "OVERDUE" : "RENTED"}
                      </p>
                      <p>Sewa: {trx.rentalDays ?? 1} hari</p>
                      <p className="text-right">Jatuh tempo: {trx.returnDueDate ? formatShortDate(trx.returnDueDate) : "-"}</p>
                      <p className="col-span-2">Waktu transaksi: {formatDateTime(trx.createdAt)}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  Tidak ada transaksi pengembalian yang perlu diproses.
                </div>
              )}
            </div>
          </section>
        </section>

        <aside className="xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)]">
          <section className="flex h-full flex-col rounded-[2rem] bg-slate-950 p-5 text-white shadow-2xl shadow-slate-950/20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">Form pengembalian</p>
                <h2 className="text-2xl font-black tracking-tight">{active?.invoiceCode ?? "Belum dipilih"}</h2>
              </div>
              <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
                <CalendarClock size={23} />
              </span>
            </div>

            {message ? (
              <div className="mt-5 rounded-2xl bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-100">
                {message}
              </div>
            ) : null}

            {active ? (
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100/80">
                    Tanggal kembali aktual
                  </span>
                  <input
                    type="date"
                    value={actualReturnDate}
                    onChange={(event) => setActualReturnDate(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 font-bold text-white outline-none focus:border-emerald-300"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100/80">
                    Pembayaran tambahan saat kembali
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={additionalPaidAmount || ""}
                    onChange={(event) => setAdditionalPaidAmount(Math.max(0, Number(event.target.value) || 0))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 font-bold text-white outline-none focus:border-emerald-300"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100/80">
                    Kondisi barang saat kembali
                  </span>
                  <input
                    value={returnCondition}
                    onChange={(event) => setReturnCondition(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 font-bold text-white outline-none focus:border-emerald-300"
                    placeholder="Contoh: baik / ada kerusakan kecil"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100/80">
                    Kelengkapan aksesori saat kembali
                  </span>
                  <input
                    value={returnAccessories}
                    onChange={(event) => setReturnAccessories(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 font-bold text-white outline-none focus:border-emerald-300"
                    placeholder="Contoh: pasak 8/10, cover ada"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100/80">
                    Foto / catatan dokumentasi
                  </span>
                  <input
                    value={returnPhotoNotes}
                    onChange={(event) => setReturnPhotoNotes(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 font-bold text-white outline-none focus:border-emerald-300"
                    placeholder="Contoh: foto sesudah return di galeri admin"
                  />
                </label>

                <div className="space-y-2 rounded-2xl bg-white p-4 text-slate-950">
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Jatuh tempo</span>
                    <span>{active.returnDueDate ? formatShortDate(active.returnDueDate) : "-"}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Telat (preview)</span>
                    <span>{preview?.lateDays ?? active.lateDays ?? 0} hari</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Total saat ini</span>
                    <span>{formatCurrency(preview?.oldTotal ?? active.totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Dibayar sebelum proses</span>
                    <span>{formatCurrency(preview?.paidBefore ?? active.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Dibayar setelah tambah</span>
                    <span>{formatCurrency(preview?.paidAfter ?? active.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-black">
                    <span>Sisa setelah proses</span>
                    <span>
                      {formatCurrency(
                        Math.max(0, (preview?.oldTotal ?? active.totalPrice) - (preview?.paidAfter ?? active.paidAmount)),
                      )}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-2xl bg-emerald-400 px-5 py-4 text-base font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
                >
                  {saving ? "Memproses..." : "Proses Pengembalian"}
                </button>
              </form>
            ) : (
              <div className="mt-8 rounded-3xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">
                Pilih transaksi sewa dari daftar untuk memproses pengembalian.
              </div>
            )}
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
