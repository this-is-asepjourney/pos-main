import type { ReactNode } from "react";

type StatCardProps = {
  title: string;
  value: string | number;
  icon: ReactNode;
};

export function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          {title}
        </span>
        <span className="flex size-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
          {icon}
        </span>
      </div>
      <p className="mt-5 text-3xl font-black tracking-tight text-slate-950">{value}</p>
    </div>
  );
}
