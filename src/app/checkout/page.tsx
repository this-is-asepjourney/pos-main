"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, CreditCard, Receipt, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CartPanel } from "@/components/cart-panel";
import { SuccessPopup } from "@/components/success-popup";
import { useAuth } from "@/components/app-provider";
import { useCart } from "@/components/cart-provider";
import { checkout } from "@/services/transaction-service";
import type { PaymentMethod } from "@/types/pos";
import { clsx } from "clsx";

export default function CheckoutPage() {
  const router = useRouter();
  const { user, displayName } = useAuth();
  const {
    cart,
    rentalDays,
    pickupDate,
    setPickupDate,
    returnDueDate,
    setReturnDueDate,
    firstDaySubtotal,
    rentalSubtotal,
    grandTotal,
    renterIdType,
    setRenterIdType,
    renterIdNumber,
    setRenterIdNumber,
    checkoutCondition,
    setCheckoutCondition,
    checkoutAccessories,
    setCheckoutAccessories,
    checkoutPhotoNotes,
    setCheckoutPhotoNotes,
    dateScheduleError,
    increaseQty,
    decreaseQty,
    removeFromCart,
    clearCart,
  } = useCart();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paidAmount, setPaidAmount] = useState(0);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [successPopup, setSuccessPopup] = useState("");

  const effectivePaidAmount = paymentMethod === "qris" ? grandTotal : paidAmount;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    setIsCheckingOut(true);
    setNotice(null);

    try {
      const invoiceCode = await checkout({
        cart,
        rentalDays,
        pickupDate,
        returnDueDate,
        actualReturnDate: "",
        firstDaySubtotal,
        multiDayExtraAmount: rentalSubtotal - firstDaySubtotal,
        renterIdType,
        renterIdNumber,
        checkoutChecklist: {
          condition: checkoutCondition.trim(),
          accessories: checkoutAccessories.trim(),
          photoNotes: checkoutPhotoNotes.trim(),
        },
        baseTotalPrice: rentalSubtotal,
        lateDays: 0,
        lateFeeAmount: 0,
        totalPrice: grandTotal,
        paidAmount: effectivePaidAmount,
        paymentMethod,
        userId: user?.uid ?? "demo-admin",
        userName: displayName,
      });

      const successMessage = `Transaksi ${invoiceCode} berhasil disimpan.`;
      setNotice({ type: "success", message: successMessage });
      setSuccessPopup(successMessage);
      
      // Wait a bit then clear and redirect
      setTimeout(() => {
        clearCart();
        router.push("/");
      }, 2000);
      
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Checkout gagal diproses.",
      });
      setIsCheckingOut(false);
    }
  };

  if (cart.length === 0 && !successPopup) {
    return (
      <AppShell allowedRoles={["admin", "cashier"]}>
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
          <div className="mb-6 flex size-20 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
            <Receipt size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Keranjang kosong</h1>
          <p className="mt-2 text-slate-500">Pilih item di halaman kasir terlebih dahulu.</p>
          <button
            onClick={() => router.push("/")}
            className="mt-8 flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 font-bold text-white transition hover:bg-slate-800"
          >
            <ArrowLeft size={18} />
            Kembali ke Kasir
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell allowedRoles={["admin", "cashier"]}>
      <SuccessPopup message={successPopup} onClose={() => {}} />
      
      <div className="mx-auto max-w-5xl p-3 sm:p-4 lg:p-10">
        <header className="mb-5 lg:mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex size-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Pembayaran</h1>
              <p className="text-sm text-slate-500">Selesaikan transaksi dan cetak struk.</p>
            </div>
          </div>
          <div className="hidden items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-2 text-emerald-700 sm:flex">
            <CreditCard size={18} />
            <span className="text-sm font-bold">Checkout Aman</span>
          </div>
        </header>

        {notice && notice.type === "error" && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            <TriangleAlert size={19} />
            {notice.message}
          </div>
        )}

        <div className="grid gap-4 lg:gap-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Penyewa</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Receipt size={20} />
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900 leading-none">
                      {renterIdNumber || "Umum"}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500 uppercase">
                      {renterIdType || "Tanpa Identitas"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Durasi Sewa</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900 leading-none">{rentalDays} Hari</p>
                    <p className="mt-1 text-xs font-bold text-slate-500 uppercase">Total Durasi</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tanggal Ambil</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900 leading-none">{pickupDate || "-"}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500 uppercase">Pick-up</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rencana Kembali</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900 leading-none">{returnDueDate || "-"}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500 uppercase">Drop-off</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Rincian Biaya Sewa</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-bold">Subtotal Hari ke-1</span>
                    <span className="font-black text-slate-900">{formatCurrency(firstDaySubtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-bold">Tambahan Hari 2+</span>
                    <span className="font-black text-slate-900">{formatCurrency(rentalSubtotal - firstDaySubtotal)}</span>
                  </div>
                  <div className="pt-4 border-t border-dashed border-slate-200">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Akhir</p>
                        <p className="text-3xl font-black text-slate-950 mt-1">{formatCurrency(grandTotal)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Status</p>
                        <p className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full mt-1">Siap Bayar</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-amber-200 bg-amber-50/50 p-6">
              <div className="flex gap-4">
                <TriangleAlert className="text-amber-600 shrink-0" size={24} />
                <div>
                  <h3 className="font-black text-amber-900">Perhatian Sebelum Checkout</h3>
                  <p className="mt-1 text-sm text-amber-800 leading-relaxed">
                    Pastikan identitas penyewa sudah benar. Keterlambatan akan dikenakan denda otomatis saat barang kembali sesuai regulasi toko (20%/50% per hari).
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:sticky lg:top-10">
            <CartPanel
              cart={cart}
              rentalDays={rentalDays}
              pickupDate={pickupDate}
              returnDueDate={returnDueDate}
              onPickupDateChange={setPickupDate}
              onReturnDueDateChange={setReturnDueDate}
              checkoutCondition={checkoutCondition}
              checkoutAccessories={checkoutAccessories}
              checkoutPhotoNotes={checkoutPhotoNotes}
              onCheckoutConditionChange={setCheckoutCondition}
              onCheckoutAccessoriesChange={setCheckoutAccessories}
              onCheckoutPhotoNotesChange={setCheckoutPhotoNotes}
              dateScheduleError={dateScheduleError}
              firstDaySubtotal={firstDaySubtotal}
              multiDayExtraAmount={rentalSubtotal - firstDaySubtotal}
              mixedCategoryWarning={false}
              renterIdType={renterIdType}
              renterIdNumber={renterIdNumber}
              onRenterIdTypeChange={setRenterIdType}
              onRenterIdNumberChange={setRenterIdNumber}
              baseTotalPrice={rentalSubtotal}
              lateFeeAmount={0}
              grandTotal={grandTotal}
              paidAmount={paidAmount}
              paymentMethod={paymentMethod}
              isCheckingOut={isCheckingOut}
              onPaidAmountChange={setPaidAmount}
              onPaymentMethodChange={(method) => {
                setPaymentMethod(method);
                setPaidAmount(0);
              }}
              onIncrease={increaseQty}
              onDecrease={decreaseQty}
              onRemove={removeFromCart}
              onCheckout={handleCheckout}
              showPaymentFields={true}
              showOrderDetails={true}
              showDateInputs={false}
              showItemList={false}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

const formatCurrency = (val: number) => 
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
