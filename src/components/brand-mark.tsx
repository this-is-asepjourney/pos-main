import { ReceiptText, Sparkles } from "lucide-react";
import { clsx } from "clsx";

type BrandMarkProps = {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
};

export function BrandMark({ className, iconClassName, textClassName }: BrandMarkProps) {
  return (
    <div className={clsx("flex items-center gap-3", className)}>
      <span
        className={clsx(
          "relative flex size-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-300 via-sky-400 to-blue-600 text-slate-950 shadow-xl shadow-cyan-400/25 ring-1 ring-white/20",
          iconClassName,
        )}
      >
        <span className="absolute -right-3 -top-3 size-8 rounded-full bg-white/35 blur-sm" />
        <ReceiptText size={23} className="relative z-10" />
        <Sparkles size={12} className="absolute right-2 top-2 text-white" />
      </span>
      <span className={textClassName}>
        <span className="block text-xl font-black tracking-tight">Bro-POS</span>
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
          Smart cashier
        </span>
      </span>
    </div>
  );
}
