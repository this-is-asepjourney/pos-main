import { ImageIcon } from "lucide-react";
import { clsx } from "clsx";

type ProductImageProps = {
  src?: string;
  name: string;
  className?: string;
};

export function ProductImage({ src, name, className }: ProductImageProps) {
  const initials = name.trim().slice(0, 2).toUpperCase() || "PR";

  return (
    <div
      className={clsx(
        "flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-amber-50 to-cyan-100 text-cyan-900",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-1 text-center">
          <ImageIcon size={18} className="opacity-70" />
          <span className="text-xs font-black">{initials}</span>
        </div>
      )}
    </div>
  );
}
