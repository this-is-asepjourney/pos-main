import { Mountain, TentTree, Trees } from "lucide-react";
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
          "relative flex size-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-300 via-emerald-500 to-green-700 text-white shadow-xl shadow-emerald-600/25 ring-1 ring-white/20",
          iconClassName,
        )}
      >
        <span className="absolute -right-3 -top-3 size-8 rounded-full bg-white/25 blur-sm" />
        <TentTree size={21} className="relative z-10" />
        <Mountain size={12} className="absolute right-1.5 top-1.5 text-emerald-100" />
        <Trees size={12} className="absolute -bottom-0.5 left-1.5 text-emerald-100" />
      </span>
      <span className={textClassName}>
        <span className="block text-xl font-black tracking-tight">JIROLU</span>
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
          Capture your nature
        </span>
      </span>
    </div>
  );
}
