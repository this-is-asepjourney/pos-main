"use client";

import { Plus, TriangleAlert } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/types/pos";
import { clsx } from "clsx";
import { ProductImage } from "@/components/product-image";

type ProductCardProps = {
  product: Product;
  onAdd: (product: Product) => void;
};

export function ProductCard({ product, onAdd }: ProductCardProps) {
  const lowStock = product.stock > 0 && product.stock <= 10;
  const outOfStock = product.stock <= 0;

  return (
    <article className="group flex flex-col justify-between rounded-2xl lg:rounded-3xl border border-slate-200/90 bg-white p-2.5 lg:p-3 shadow-md shadow-slate-200/40 transition hover:-translate-y-1 hover:border-emerald-300/80 hover:shadow-xl hover:shadow-emerald-900/10">
      <div>
        <div className="relative">
          <ProductImage
            src={product.imageUrl}
            name={product.name}
            className="h-24 lg:h-36 w-full rounded-xl lg:rounded-2xl"
          />
          <span
            className={clsx(
              "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm backdrop-blur",
              outOfStock
                ? "bg-rose-100/95 text-rose-700"
                : lowStock
                  ? "bg-amber-100/95 text-amber-700"
                  : "bg-emerald-100/95 text-emerald-700",
            )}
          >
            {product.stock}
          </span>
        </div>
        <p className="mt-2 px-1 text-[9px] lg:text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 truncate">
          {product.categoryName}
        </p>
        <h3 className="mt-0.5 px-1 text-sm lg:text-base font-bold tracking-tight text-slate-950 line-clamp-2 leading-tight">{product.name}</h3>
        {product.specification ? (
          <p className="hidden lg:block mt-0.5 px-1 text-[9px] lg:text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {product.specification}
          </p>
        ) : null}
        <div className="mt-1.5 px-1">
          <p className="text-sm lg:text-xl font-black tabular-nums text-slate-950">{formatCurrency(product.price)}</p>
          <p className="mt-0.5 text-[8px] lg:text-[0.65rem] font-bold uppercase tracking-[0.14em] text-emerald-700/90">
            Tarif hari ke-1
          </p>
        </div>
        {lowStock ? (
          <p className="mt-1.5 flex items-center gap-1 px-1 text-[10px] font-semibold text-amber-600">
            <TriangleAlert size={11} />
            Stok tipis
          </p>
        ) : null}
      </div>

      <button
        type="button"
        disabled={outOfStock}
        onClick={() => onAdd(product)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl lg:rounded-2xl bg-gradient-to-r from-slate-950 to-slate-800 px-3 py-2.5 text-xs lg:text-sm font-bold text-white shadow-md transition hover:from-emerald-600 hover:to-cyan-600 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-500 min-h-[40px]"
      >
        <Plus size={15} />
        {outOfStock ? "Habis" : "Tambah"}
      </button>
    </article>
  );
}
