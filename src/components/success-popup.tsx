"use client";

import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

type SuccessPopupProps = {
  message: string;
  onClose: () => void;
};

export function SuccessPopup({ message, onClose }: SuccessPopupProps) {
  useEffect(() => {
    if (!message) return undefined;

    const timer = window.setTimeout(onClose, 3500);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed right-4 top-4 z-50 w-[calc(100%-2rem)] max-w-sm rounded-3xl border border-emerald-200 bg-white p-4 text-slate-950 shadow-2xl shadow-emerald-950/15">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <CheckCircle2 size={23} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">
            Berhasil
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-700">{message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Tutup popup"
        >
          <X size={17} />
        </button>
      </div>
    </div>
  );
}
