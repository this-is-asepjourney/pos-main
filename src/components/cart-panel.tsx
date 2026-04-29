"use client";

import { Minus, Plus, Receipt, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { createQrisImageUrl, isQrisConfigured } from "@/lib/qris";
import type { CartItem, PaymentMethod } from "@/types/pos";
import { clsx } from "clsx";
import { ProductImage } from "@/components/product-image";

type CartPanelProps = {
  cart: CartItem[];
  paidAmount: number;
  paymentMethod: PaymentMethod;
  isCheckingOut: boolean;
  onPaidAmountChange: (value: number) => void;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  onIncrease: (productId: string) => void;
  onDecrease: (productId: string) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
};

const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "qris", label: "QRIS" },
  { value: "debit", label: "Debit" },
];

export function CartPanel({
  cart,
  paidAmount,
  paymentMethod,
  isCheckingOut,
  onPaidAmountChange,
  onPaymentMethodChange,
  onIncrease,
  onDecrease,
  onRemove,
  onCheckout,
}: CartPanelProps) {
  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const change = Math.max(0, paidAmount - total);
  const qrisImageUrl = paymentMethod === "qris" ? createQrisImageUrl(total) : "";
  const canCheckout =
    cart.length > 0 &&
    paidAmount >= total &&
    !isCheckingOut &&
    (paymentMethod !== "qris" || isQrisConfigured);

  return (
    <section className="flex h-full flex-col rounded-[2rem] bg-slate-950 p-5 text-white shadow-2xl shadow-slate-950/20">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">Keranjang</p>
          <h2 className="text-2xl font-black tracking-tight">Order Aktif</h2>
        </div>
        <span className="flex size-12 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950">
          <Receipt size={23} />
        </span>
      </div>

      <div className="mt-6 flex-1 space-y-3 overflow-y-auto pr-1">
        {cart.length ? (
          cart.map((item) => (
            <div key={item.productId} className="rounded-3xl bg-white/8 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <ProductImage
                    src={item.imageUrl}
                    name={item.name}
                    className="size-12 rounded-2xl"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-bold">{item.name}</p>
                    <p className="text-sm text-slate-400">{formatCurrency(item.price)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(item.productId)}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-rose-200"
                  aria-label={`Hapus ${item.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 rounded-2xl bg-slate-900 p-1">
                  <button
                    type="button"
                    onClick={() => onDecrease(item.productId)}
                    className="flex size-8 items-center justify-center rounded-xl bg-white/10"
                  >
                    <Minus size={15} />
                  </button>
                  <span className="w-8 text-center text-sm font-bold">{item.qty}</span>
                  <button
                    type="button"
                    onClick={() => onIncrease(item.productId)}
                    disabled={item.qty >= item.stock}
                    className="flex size-8 items-center justify-center rounded-xl bg-white/10 disabled:opacity-40"
                  >
                    <Plus size={15} />
                  </button>
                </div>
                <p className="font-black">{formatCurrency(item.subtotal)}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">
            Pilih produk untuk mulai membuat transaksi.
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4 border-t border-white/10 pt-5">
        <div className="grid grid-cols-3 gap-2">
          {paymentMethods.map((method) => (
            <button
              key={method.value}
              type="button"
              onClick={() => onPaymentMethodChange(method.value)}
              className={clsx(
                "rounded-2xl px-3 py-2 text-sm font-bold transition",
                paymentMethod === method.value
                  ? "bg-cyan-400 text-slate-950"
                  : "bg-white/10 text-slate-300 hover:bg-white/15",
              )}
            >
              {method.label}
            </button>
          ))}
        </div>

        {paymentMethod === "qris" ? (
          <div className="rounded-3xl border border-cyan-300/30 bg-cyan-300/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-cyan-100">QRIS Otomatis</p>
                <p className="mt-1 text-xs text-cyan-100/75">
                  Nominal QR mengikuti total belanja. Klik checkout setelah pembayaran diterima.
                </p>
              </div>
              <span className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-black text-slate-950">
                {formatCurrency(total)}
              </span>
            </div>
            {isQrisConfigured && qrisImageUrl ? (
              <div className="mt-4 rounded-3xl bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrisImageUrl} alt="QRIS pembayaran" className="mx-auto size-56 rounded-2xl" />
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-cyan-200/30 p-4 text-sm font-semibold text-cyan-100">
                Isi `NEXT_PUBLIC_QRIS_STATIC_PAYLOAD` di `.env.local` agar QRIS otomatis aktif.
              </div>
            )}
          </div>
        ) : null}

        <label className="block">
          <span className="text-sm font-semibold text-slate-300">
            {paymentMethod === "qris" ? "Nominal bayar QRIS" : "Nominal bayar"}
          </span>
          <input
            type="number"
            min={0}
            value={paidAmount || ""}
            onChange={(event) => onPaidAmountChange(Number(event.target.value))}
            placeholder="0"
            readOnly={paymentMethod === "qris"}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-lg font-bold outline-none ring-cyan-300/40 transition placeholder:text-slate-500 read-only:text-cyan-100 focus:ring-4"
          />
        </label>

        <div className="space-y-2 rounded-3xl bg-white p-4 text-slate-950">
          <div className="flex justify-between text-sm text-slate-500">
            <span>Total item</span>
            <span>{cart.reduce((sum, item) => sum + item.qty, 0)} item</span>
          </div>
          <div className="flex justify-between text-sm text-slate-500">
            <span>Total belanja</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <div className="flex items-end justify-between border-t border-slate-200 pt-3">
            <span className="font-bold">Kembalian</span>
            <span className="text-2xl font-black text-cyan-700">{formatCurrency(change)}</span>
          </div>
        </div>

        <button
          type="button"
          disabled={!canCheckout}
          onClick={onCheckout}
          className="w-full rounded-2xl bg-cyan-400 px-5 py-4 text-base font-black text-slate-950 transition hover:bg-cyan-300 disabled:bg-slate-700 disabled:text-slate-400"
        >
          {isCheckingOut ? "Memproses..." : "Checkout Sekarang"}
        </button>
      </div>
    </section>
  );
}
