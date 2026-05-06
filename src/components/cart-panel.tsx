"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Backpack,
  Banknote,
  CalendarClock,
  CalendarDays,
  IdCard,
  Minus,
  Plus,
  QrCode,
  Receipt,
  Trash2,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { createQrisImageUrl, isQrisConfigured } from "@/lib/qris";
import { computeRentalLineTotal } from "@/lib/rental";
import type { CartItem, PaymentMethod, RenterIdType } from "@/types/pos";
import { clsx } from "clsx";
import { ProductImage } from "@/components/product-image";

type CartPanelProps = {
  cart: CartItem[];
  rentalDays: number;
  pickupDate: string;
  returnDueDate: string;
  onPickupDateChange: (value: string) => void;
  onReturnDueDateChange: (value: string) => void;
  checkoutCondition: string;
  checkoutAccessories: string;
  checkoutPhotoNotes: string;
  onCheckoutConditionChange: (value: string) => void;
  onCheckoutAccessoriesChange: (value: string) => void;
  onCheckoutPhotoNotesChange: (value: string) => void;
  dateScheduleError: string;
  firstDaySubtotal: number;
  multiDayExtraAmount: number;
  rentalSubtotalBeforeHoliday: number;
  holidayMultiplier: number;
  yearEndHolidayApplied: boolean;
  yearEndHolidayNotice: string;
  mixedCategoryWarning: boolean;
  renterIdType: RenterIdType;
  renterIdNumber: string;
  onRenterIdTypeChange: (value: RenterIdType) => void;
  onRenterIdNumberChange: (value: string) => void;
  baseTotalPrice: number;
  lateFeeAmount: number;
  grandTotal: number;
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

const paymentMethods: Array<{
  value: PaymentMethod;
  label: string;
  icon: LucideIcon;
}> = [
  { value: "cash", label: "Tunai", icon: Banknote },
  { value: "qris", label: "QRIS", icon: QrCode },
  { value: "debit", label: "Kartu", icon: Wallet },
];

function PanelSection({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-inner shadow-black/20 backdrop-blur-sm">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/25 to-cyan-500/20 ring-1 ring-white/10">
          <Icon className="text-emerald-200" size={20} strokeWidth={2.25} aria-hidden />
        </span>
        <div className="min-w-0 pt-0.5">
          <h3 className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-slate-400">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function AlertBanner({
  tone,
  children,
  icon: Icon,
}: {
  tone: "amber" | "rose" | "cyan";
  children: ReactNode;
  icon?: LucideIcon;
}) {
  const IconComp = Icon ?? AlertTriangle;
  const styles = {
    amber: "border-amber-400/35 bg-amber-500/10 text-amber-100",
    rose: "border-rose-400/35 bg-rose-500/10 text-rose-100",
    cyan: "border-cyan-400/35 bg-cyan-500/10 text-cyan-100",
  }[tone];
  return (
    <div
      className={clsx(
        "flex gap-3 rounded-2xl border px-3.5 py-3 text-xs font-semibold leading-snug",
        styles,
      )}
    >
      <IconComp className="mt-0.5 size-4 shrink-0 opacity-90" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function CartPanel({
  cart,
  rentalDays,
  pickupDate,
  returnDueDate,
  onPickupDateChange,
  onReturnDueDateChange,
  checkoutCondition,
  checkoutAccessories,
  checkoutPhotoNotes,
  onCheckoutConditionChange,
  onCheckoutAccessoriesChange,
  onCheckoutPhotoNotesChange,
  dateScheduleError,
  firstDaySubtotal,
  multiDayExtraAmount,
  rentalSubtotalBeforeHoliday,
  holidayMultiplier,
  yearEndHolidayApplied,
  yearEndHolidayNotice,
  mixedCategoryWarning,
  renterIdType,
  renterIdNumber,
  onRenterIdTypeChange,
  onRenterIdNumberChange,
  baseTotalPrice,
  lateFeeAmount,
  grandTotal,
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
  const parseInputNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const total = grandTotal;
  const change = Math.max(0, paidAmount - total);
  const qrisImageUrl = paymentMethod === "qris" ? createQrisImageUrl(total) : "";
  const canCheckout =
    cart.length > 0 &&
    Boolean(pickupDate && returnDueDate) &&
    !dateScheduleError &&
    paidAmount >= total &&
    !isCheckingOut &&
    (paymentMethod !== "qris" || isQrisConfigured);

  const inputClass =
    "w-full rounded-xl border border-white/15 bg-slate-950/80 px-3 py-2.5 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/25 [color-scheme:dark]";

  return (
    <section
      className={clsx(
        "flex h-full flex-col overflow-hidden rounded-[2rem] text-white",
        "bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950",
        "shadow-2xl shadow-emerald-950/30 ring-1 ring-white/10",
      )}
    >
      <div className="relative shrink-0 border-b border-white/10 bg-slate-950/80 px-5 pb-4 pt-5 backdrop-blur-md">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_0%_-20%,rgba(16,185,129,0.18),transparent_55%)]"
          aria-hidden
        />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em] text-emerald-200 ring-1 ring-emerald-400/20">
              <Backpack size={12} strokeWidth={2.5} className="opacity-90" />
              Kasir sewa
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-white">Ringkasan order</h2>
            <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-slate-400">
              Atur periode, identitas, lalu bayar. Ringkasan rupiah selalu live.
            </p>
          </div>
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 text-slate-950 shadow-lg shadow-emerald-900/40">
            <Receipt size={26} strokeWidth={2.25} />
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div>
          <p className="mb-2 flex items-center justify-between px-1 text-[0.65rem] font-black uppercase tracking-[0.2em] text-slate-500">
            <span>Barang disewa</span>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[0.65rem] text-slate-300">
              {cart.length} jenis
            </span>
          </p>
          {cart.length ? (
            <ul className="space-y-3">
              {cart.map((item) => {
                const lineRental = Math.round(
                  computeRentalLineTotal(item.price, item.qty, rentalDays) * holidayMultiplier,
                );
                return (
                  <li
                    key={item.productId}
                    className="group rounded-2xl border border-white/10 bg-slate-900/50 p-3.5 transition hover:border-emerald-500/25 hover:bg-slate-900/70"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <ProductImage
                          src={item.imageUrl}
                          name={item.name}
                          className="size-14 rounded-2xl ring-2 ring-white/5 transition group-hover:ring-emerald-500/20"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-bold text-white">{item.name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Hari ke-1:{" "}
                            <span className="font-semibold text-slate-300">{formatCurrency(item.price)}</span>
                            / unit
                          </p>
                          {item.categoryName ? (
                            <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-600">
                              {item.categoryName}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemove(item.productId)}
                        className="rounded-xl p-2 text-slate-500 transition hover:bg-rose-500/15 hover:text-rose-200"
                        aria-label={`Hapus ${item.name}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/5 pt-3">
                      <div className="flex items-center gap-1 rounded-xl bg-slate-950 p-1 ring-1 ring-white/10">
                        <button
                          type="button"
                          onClick={() => onDecrease(item.productId)}
                          className="flex size-9 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/15"
                          aria-label="Kurangi qty"
                        >
                          <Minus size={16} strokeWidth={2.5} />
                        </button>
                        <span className="min-w-[2rem] text-center text-sm font-black tabular-nums">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => onIncrease(item.productId)}
                          disabled={item.qty >= item.stock}
                          className="flex size-9 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/15 disabled:opacity-35"
                          aria-label="Tambah qty"
                        >
                          <Plus size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">
                          Subtotal hari ke-1
                        </p>
                        <p className="text-sm font-bold text-slate-200 tabular-nums">{formatCurrency(item.subtotal)}</p>
                        <p className="mt-1 inline-flex flex-col items-end rounded-lg bg-emerald-500/10 px-2 py-1 ring-1 ring-emerald-400/20">
                          <span className="text-[0.6rem] font-bold uppercase tracking-wider text-emerald-200/90">
                            {rentalDays} hari sewa
                          </span>
                          <span className="text-sm font-black text-emerald-100 tabular-nums">
                            {formatCurrency(lineRental)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-slate-900/30 px-6 py-12 text-center">
              <Backpack className="mb-3 size-10 text-slate-600" strokeWidth={1.5} aria-hidden />
              <p className="text-sm font-bold text-slate-400">Belum ada barang</p>
              <p className="mt-1 max-w-[220px] text-xs text-slate-600">
                Pilih alat di katalog. Harga tertera adalah tarif hari pertama per unit.
              </p>
            </div>
          )}
        </div>

        {mixedCategoryWarning ? (
          <AlertBanner tone="amber" icon={AlertTriangle}>
            Keranjang mencampur kategori dengan rumus denda berbeda (normal 20%/hari, perlampuan dihitung dari
            50% dasar tarif, sekali pakai bebas). Total sudah dijumlahkan per barang.
          </AlertBanner>
        ) : null}

        {yearEndHolidayApplied ? (
          <AlertBanner tone="cyan" icon={CalendarDays}>
            {yearEndHolidayNotice}
          </AlertBanner>
        ) : null}

        {dateScheduleError ? (
          <AlertBanner tone="rose" icon={AlertTriangle}>
            {dateScheduleError}
          </AlertBanner>
        ) : null}

        <PanelSection
          icon={CalendarDays}
          title="Periode sewa"
          subtitle="Tanggal mengunci lama sewa. Kosongkan keduanya jika pakai input manual di bawah."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-400">
                <CalendarDays size={14} className="text-emerald-400/80" />
                Tanggal ambil
              </span>
              <input
                type="date"
                value={pickupDate}
                onChange={(event) => onPickupDateChange(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-400">
                <CalendarClock size={14} className="text-emerald-400/80" />
                Rencana kembali
              </span>
              <input
                type="date"
                value={returnDueDate}
                onChange={(event) => onReturnDueDateChange(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Lama sewa</span>
            <span className="rounded-full bg-gradient-to-r from-emerald-500/25 to-cyan-500/20 px-4 py-1.5 text-sm font-black tabular-nums text-emerald-100 ring-1 ring-emerald-400/30">
              {rentalDays} hari
            </span>
            {!pickupDate || !returnDueDate ? (
              <span className="text-[0.65rem] text-rose-300">wajib isi tanggal</span>
            ) : null}
          </div>
        </PanelSection>

        <PanelSection
          icon={CalendarClock}
          title="Checklist keluar barang"
          subtitle="Dicatat saat checkout untuk bukti kondisi awal alat sewa."
        >
          <label className="block">
            <span className="mb-1 text-xs font-bold text-slate-400">Kondisi barang saat keluar</span>
            <input
              value={checkoutCondition}
              onChange={(event) => onCheckoutConditionChange(event.target.value)}
              placeholder="Contoh: baik, ada gores halus"
              className={inputClass}
            />
          </label>
          <label className="mt-3 block">
            <span className="mb-1 text-xs font-bold text-slate-400">Aksesori yang ikut</span>
            <input
              value={checkoutAccessories}
              onChange={(event) => onCheckoutAccessoriesChange(event.target.value)}
              placeholder="Contoh: pasak 10, rainfly, cover"
              className={inputClass}
            />
          </label>
          <label className="mt-3 block">
            <span className="mb-1 text-xs font-bold text-slate-400">Foto / catatan dokumentasi</span>
            <input
              value={checkoutPhotoNotes}
              onChange={(event) => onCheckoutPhotoNotesChange(event.target.value)}
              placeholder="Contoh: foto sebelum sewa di galeri admin"
              className={inputClass}
            />
          </label>
        </PanelSection>

        <PanelSection
          icon={CalendarClock}
          title="Pengembalian & denda"
          subtitle="Denda keterlambatan diproses di menu Pengembalian setelah barang dikembalikan."
        >
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-3">
            <p className="text-sm font-semibold text-emerald-100/95">
              Checkout hanya mencatat sewa awal. Saat pengembalian, sistem menghitung telat dan denda otomatis
              berdasarkan tanggal kembali aktual.
            </p>
          </div>
        </PanelSection>

        <PanelSection
          icon={IdCard}
          title="Identitas penyewa"
          subtitle="Opsional. Isi jenis dan nomor sekaligus, cocok dengan ketentuan titip KTP/SIM."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 text-xs font-bold text-slate-400">Jenis</span>
              <select
                value={renterIdType}
                onChange={(event) => onRenterIdTypeChange(event.target.value as RenterIdType)}
                className={clsx(inputClass, "cursor-pointer")}
              >
                <option value="">— tidak diisi —</option>
                <option value="ktp">KTP</option>
                <option value="sim">SIM</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 text-xs font-bold text-slate-400">Nomor</span>
              <input
                type="text"
                value={renterIdNumber}
                onChange={(event) => onRenterIdNumberChange(event.target.value)}
                placeholder="Nomor identitas"
                className={clsx(inputClass, "mt-0")}
              />
            </label>
          </div>
        </PanelSection>

        <PanelSection icon={Wallet} title="Pembayaran" subtitle="Pilih metode lalu sesuaikan nominal untuk tunai.">
          <div className="grid grid-cols-3 gap-2">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const active = paymentMethod === method.value;
              return (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => onPaymentMethodChange(method.value)}
                  className={clsx(
                    "flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-xs font-black transition",
                    active
                      ? "bg-gradient-to-b from-emerald-400 to-cyan-400 text-slate-950 shadow-md shadow-emerald-900/30"
                      : "bg-slate-950/80 text-slate-400 ring-1 ring-white/10 hover:bg-white/5 hover:text-slate-200",
                  )}
                >
                  <Icon size={20} strokeWidth={2.25} className={active ? "text-slate-950" : ""} />
                  {method.label}
                </button>
              );
            })}
          </div>

          {paymentMethod === "qris" ? (
            <div className="mt-4 rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/15 to-slate-950/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <QrCode className="mt-0.5 size-5 shrink-0 text-cyan-200" />
                  <div>
                    <p className="text-sm font-black text-cyan-50">QRIS dinamis</p>
                    <p className="mt-1 text-xs text-cyan-100/75">Nominal mengikuti total akhir di bawah.</p>
                  </div>
                </div>
                <span className="rounded-full bg-cyan-400 px-3 py-1 text-xs font-black text-slate-950 tabular-nums">
                  {formatCurrency(total)}
                </span>
              </div>
              {isQrisConfigured && qrisImageUrl ? (
                <div className="mt-4 rounded-2xl bg-white p-3 shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrisImageUrl} alt="QRIS pembayaran" className="mx-auto size-56 rounded-xl" />
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-cyan-300/30 p-4 text-xs font-semibold text-cyan-100/90">
                  Isi <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_QRIS_STATIC_PAYLOAD</code> di{" "}
                  <code className="rounded bg-black/30 px-1">.env.local</code>.
                </div>
              )}
            </div>
          ) : null}

          <label className="mt-4 block">
            <span className="text-xs font-bold text-slate-400">
              {paymentMethod === "qris" ? "Nominal (ikut QRIS)" : "Nominal dibayar"}
            </span>
            <input
              type="number"
              min={0}
              value={paidAmount || ""}
              onChange={(event) => onPaidAmountChange(Math.max(0, parseInputNumber(event.target.value)))}
              placeholder="0"
              readOnly={paymentMethod === "qris"}
              className={clsx(
                inputClass,
                "mt-1.5 text-base tabular-nums",
                paymentMethod === "qris" && "cursor-not-allowed opacity-90",
              )}
            />
          </label>
        </PanelSection>
      </div>

      <div className="shrink-0 space-y-4 border-t border-white/10 bg-slate-950/90 px-4 pb-5 pt-4 backdrop-blur-md">
        <div className="space-y-0 overflow-hidden rounded-2xl border border-slate-200/20 bg-gradient-to-b from-white to-slate-100 text-slate-950 shadow-xl shadow-black/25">
          <div className="space-y-2.5 p-4">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Barang (qty)</span>
              <span className="font-bold tabular-nums text-slate-800">
                {cart.reduce((sum, item) => sum + item.qty, 0)} item
              </span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal hari ke-1</span>
              <span className="font-semibold tabular-nums">{formatCurrency(firstDaySubtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Tambahan hari 2+</span>
              <span className="font-semibold tabular-nums">{formatCurrency(multiDayExtraAmount)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Sebelum pengali libur</span>
              <span className="font-semibold tabular-nums">{formatCurrency(rentalSubtotalBeforeHoliday)}</span>
            </div>
            {yearEndHolidayApplied ? (
              <div className="flex justify-between text-sm font-bold text-amber-900">
                <span>Pengali 28–31 Des</span>
                <span className="tabular-nums">×{holidayMultiplier.toLocaleString("id-ID")}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-black text-slate-800">
              <span>Total sewa</span>
              <span className="tabular-nums">{formatCurrency(baseTotalPrice)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Denda saat checkout</span>
              <span className="font-semibold tabular-nums text-slate-500">{formatCurrency(lateFeeAmount)}</span>
            </div>
            <div className="flex justify-between rounded-xl bg-slate-900 px-3 py-2.5 text-white">
              <span className="text-sm font-bold">Total akhir</span>
              <span className="text-lg font-black tabular-nums text-emerald-300">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
          <div className="flex justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm font-bold text-slate-600">Kembalian</span>
            <span className="text-xl font-black tabular-nums text-cyan-700">{formatCurrency(change)}</span>
          </div>
        </div>

        <button
          type="button"
          disabled={!canCheckout}
          onClick={onCheckout}
          className={clsx(
            "relative w-full overflow-hidden rounded-2xl px-5 py-4 text-base font-black transition",
            "bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 text-slate-950",
            "shadow-lg shadow-emerald-900/40 hover:brightness-105",
            "disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none",
          )}
        >
          <span className="relative z-10">{isCheckingOut ? "Memproses…" : "Selesaikan pembayaran"}</span>
        </button>
      </div>
    </section>
  );
}
