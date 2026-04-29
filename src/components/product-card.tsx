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
    <article className="group flex min-h-72 flex-col justify-between rounded-3xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-xl hover:shadow-cyan-900/5">
      <div>
        <div className="relative">
          <ProductImage
            src={product.imageUrl}
            name={product.name}
            className="h-36 w-full rounded-2xl"
          />
          <span
            className={clsx(
              "absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-bold shadow-sm backdrop-blur",
              outOfStock
                ? "bg-rose-100/95 text-rose-700"
                : lowStock
                  ? "bg-amber-100/95 text-amber-700"
                  : "bg-emerald-100/95 text-emerald-700",
            )}
          >
            Stok {product.stock}
          </span>
        </div>
        <p className="mt-4 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          {product.categoryName}
        </p>
        <h3 className="mt-1 px-1 text-lg font-bold tracking-tight text-slate-950">{product.name}</h3>
        <p className="mt-2 px-1 text-2xl font-black text-slate-950">{formatCurrency(product.price)}</p>
        {lowStock ? (
          <p className="mt-3 flex items-center gap-2 px-1 text-xs font-semibold text-amber-600">
            <TriangleAlert size={14} />
            Stok mulai menipis
          </p>
        ) : null}
      </div>

      <button
        type="button"
        disabled={outOfStock}
        onClick={() => onAdd(product)}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-cyan-600 disabled:bg-slate-200 disabled:text-slate-500"
      >
        <Plus size={18} />
        {outOfStock ? "Stok Habis" : "Tambah"}
      </button>
    </article>
  );
}
