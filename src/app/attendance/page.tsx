"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, History, LogOut, PlayCircle, UsersRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/app-provider";
import { formatDateTime, toDate } from "@/lib/format";
import {
  endShift,
  startShift,
  subscribeActiveShifts,
  subscribeAttendanceHistory,
  subscribeMyActiveShift,
} from "@/services/attendance-service";
import type { ShiftAttendance } from "@/types/pos";

const formatShiftDuration = (shift: ShiftAttendance) => {
  const startedAt = toDate(shift.startedAt);
  const endedAt = shift.endedAt ? toDate(shift.endedAt) : new Date();
  const durationMs = Math.max(0, endedAt.getTime() - startedAt.getTime());
  const totalMinutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) return `${minutes} menit`;
  return `${hours} jam ${minutes} menit`;
};

export default function AttendancePage() {
  const { user, displayName, role, tenantId, branchActive } = useAuth();
  const isManager = role === "admin" || role === "owner";
  const [myShift, setMyShift] = useState<ShiftAttendance | null>(null);
  const [activeShifts, setActiveShifts] = useState<ShiftAttendance[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<ShiftAttendance[]>([]);
  const [message, setMessage] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!tenantId || !user?.uid) return () => undefined;
    return subscribeMyActiveShift(tenantId, user.uid, setMyShift);
  }, [tenantId, user?.uid]);

  useEffect(() => {
    if (!tenantId || !isManager) {
      return () => undefined;
    }
    return subscribeActiveShifts(tenantId, setActiveShifts);
  }, [isManager, tenantId]);

  useEffect(() => {
    if (!tenantId || !isManager) {
      return () => undefined;
    }
    return subscribeAttendanceHistory(tenantId, setAttendanceHistory, 150);
  }, [isManager, tenantId]);

  const displayedActiveShifts = isManager ? activeShifts : myShift ? [myShift] : [];

  const handleStartShift = async () => {
    if (!tenantId || !user?.uid) return;

    setProcessing(true);
    setMessage("");

    try {
      await startShift(tenantId, user.uid, displayName, role, branchActive);
      setMessage("Shift berhasil dimulai.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memulai shift.");
    } finally {
      setProcessing(false);
    }
  };

  const handleEndShift = async () => {
    if (!tenantId || !myShift) return;

    setProcessing(true);
    setMessage("");

    try {
      await endShift(tenantId, myShift.id);
      setMessage("Shift berhasil diakhiri.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal mengakhiri shift.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AppShell allowedRoles={["owner", "admin", "cashier"]}>
      <div className="grid gap-6 p-4 xl:grid-cols-[420px_1fr] xl:p-6">
        <section className="space-y-5">
          <header className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-cyan-200">
              <Clock3 size={17} />
              Absensi Shift
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Kelola shift cashier</h1>
            <p className="mt-2 text-sm text-slate-300">
              Cashier dapat mulai dan mengakhiri shift. Admin dapat melihat siapa yang sedang aktif.
            </p>
          </header>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-700">Shift saya</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">{displayName}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">{role}</p>
              </div>
              <span className="flex size-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
                <CheckCircle2 size={23} />
              </span>
            </div>

            <div className="mt-5 rounded-3xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Status</p>
              <p className="mt-2 text-xl font-black text-slate-950">
                {myShift ? "Sedang menjalankan shift" : "Belum mulai shift"}
              </p>
              {myShift ? (
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Mulai: {formatDateTime(myShift.startedAt)}
                </p>
              ) : (
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Klik mulai shift sebelum membuka transaksi kasir.
                </p>
              )}
            </div>

            {message ? (
              <div className="mt-4 rounded-2xl bg-cyan-50 p-3 text-sm font-semibold text-cyan-800">
                {message}
              </div>
            ) : null}

            <div className="mt-5 flex gap-2">
              {myShift ? (
                <button
                  type="button"
                  onClick={handleEndShift}
                  disabled={processing}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 font-black text-white disabled:opacity-60"
                >
                  <LogOut size={18} />
                  {processing ? "Memproses..." : "Akhiri Shift"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartShift}
                  disabled={processing}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 font-black text-white disabled:opacity-60"
                >
                  <PlayCircle size={18} />
                  {processing ? "Memproses..." : "Mulai Shift"}
                </button>
              )}
            </div>
          </section>
        </section>

        <section className="space-y-5">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-700">Live shift</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">Cashier aktif</h2>
                <p className="text-sm text-slate-500">{displayedActiveShifts.length} orang sedang menjalankan shift</p>
              </div>
              <span className="flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <UsersRound size={23} />
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {displayedActiveShifts.length ? (
                displayedActiveShifts.map((shift) => (
                  <div key={shift.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-black text-slate-950">{shift.userName}</p>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">
                          {shift.role}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                        Aktif
                      </span>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-500">
                      Mulai: {formatDateTime(shift.startedAt)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500 md:col-span-2 xl:col-span-3">
                  Belum ada cashier yang menjalankan shift.
                </div>
              )}
            </div>
          </div>

          {isManager ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-700">Info absensi</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">Riwayat shift cashier</h2>
                <p className="text-sm text-slate-500">
                  {attendanceHistory.length} data shift terakhir tercatat.
                </p>
              </div>
              <span className="flex size-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
                <History size={23} />
              </span>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="py-3">Cashier</th>
                    <th>Status</th>
                    <th>Mulai</th>
                    <th>Selesai</th>
                    <th>Durasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceHistory.map((shift) => (
                    <tr key={shift.id} className="font-semibold text-slate-700">
                      <td className="py-4">
                        <p className="font-black text-slate-950">{shift.userName}</p>
                        <p className="text-xs uppercase tracking-[0.14em] text-cyan-700">{shift.role}</p>
                      </td>
                      <td>
                        <span
                          className={
                            shift.status === "active"
                              ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700"
                              : "rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600"
                          }
                        >
                          {shift.status === "active" ? "Aktif" : "Selesai"}
                        </span>
                      </td>
                      <td>{formatDateTime(shift.startedAt)}</td>
                      <td>{shift.endedAt ? formatDateTime(shift.endedAt) : "-"}</td>
                      <td className="font-black text-slate-950">{formatShiftDuration(shift)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!attendanceHistory.length ? (
                <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500">
                  Belum ada riwayat absensi cashier.
                </div>
              ) : null}
            </div>
          </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
