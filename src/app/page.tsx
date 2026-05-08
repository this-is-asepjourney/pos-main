"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Mountain,
  Package,
  PanelRightClose,
  PanelRightOpen,
  Search,
  ShoppingCart,
  Sparkles,
  Tent,
  TriangleAlert,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CartPanel } from "@/components/cart-panel";
import { ProductCard } from "@/components/product-card";
import { SuccessPopup } from "@/components/success-popup";
import { useAuth } from "@/components/app-provider";
import { formatCurrency } from "@/lib/format";
import { cartHasMixedLateFeeRules } from "@/lib/rental";
import { subscribeCategories, subscribeProducts } from "@/services/product-service";
import type { Category, Product } from "@/types/pos";
import { clsx } from "clsx";
import { useCart } from "@/components/cart-provider";
import { useRouter } from "next/navigation";

export default function CashierPage() {
  const router = useRouter();
  const { displayName } = useAuth();
  const {
    cart,
    addToCart,
    increaseQty,
    decreaseQty,
    removeFromCart,
    pickupDate,
    setPickupDate,
    returnDueDate,
    setReturnDueDate,
    checkoutCondition,
    setCheckoutCondition,
    checkoutAccessories,
    setCheckoutAccessories,
    checkoutPhotoNotes,
    setCheckoutPhotoNotes,
    renterIdType,
    setRenterIdType,
    renterIdNumber,
    setRenterIdNumber,
    rentalDays,
    dateScheduleError,
    firstDaySubtotal,
    rentalSubtotal,
    grandTotal,
  } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [successPopup, setSuccessPopup] = useState("");
  const [cartSidebarOpen, setCartSidebarOpen] = useState(true);

  useEffect(() => {
    const unsubscribeProducts = subscribeProducts(setProducts);
    const unsubscribeCategories = subscribeCategories(setCategories);

    return () => {
      unsubscribeProducts();
      unsubscribeCategories();
    };
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(query.toLowerCase());
      const matchesCategory =
        activeCategory === "all" ||
        product.categoryId === activeCategory ||
        (product.categoryIds ?? []).includes(activeCategory);
      return matchesSearch && matchesCategory;
    });
  }, [activeCategory, products, query]);

  const multiDayExtraAmount = rentalSubtotal - firstDaySubtotal;
  const baseTotalPrice = rentalSubtotal;
  const lateFeeAmount = 0;
  const lowStockProducts = products.filter((product) => product.stock <= 10).length;
  const mixedCategoryWarning = cart.length > 1 && cartHasMixedLateFeeRules(cart);

  const handleCheckout = () => {
    setNotice(null);

    if (!pickupDate || !returnDueDate || dateScheduleError) {
      setNotice({
        type: "error",
        message: "Tanggal ambil dan rencana kembali wajib diisi dengan benar.",
      });
      return;
    }

    router.push("/checkout");
  };

  return (
    <AppShell allowedRoles={["admin", "cashier"]}>
      <SuccessPopup message={successPopup} onClose={() => setSuccessPopup("")} />
      {!cartSidebarOpen ? (
        <button
          type="button"
          onClick={() => setCartSidebarOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3.5 text-sm font-black text-slate-950 shadow-2xl shadow-emerald-900/40 ring-2 ring-white/20 transition hover:brightness-110"
        >
          <ShoppingCart size={18} strokeWidth={2.5} />
          Order sewa{cart.length ? ` · ${cart.length}` : ""}
        </button>
      ) : null}
      <div
        className={clsx(
          "grid min-h-screen gap-5 p-4 lg:p-6",
          cartSidebarOpen ? "lg:grid-cols-[1fr_430px]" : "lg:grid-cols-1",
        )}
      >
        <section className="min-w-0 space-y-5">
          <header className="relative overflow-hidden rounded-[2rem] border border-emerald-950/20 bg-slate-950 p-6 text-white shadow-2xl shadow-emerald-950/20">
            <div
              className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-emerald-500/15 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-20 left-1/4 size-56 rounded-full bg-cyan-500/10 blur-3xl"
              aria-hidden
            />
            <div className="absolute right-8 top-8 hidden opacity-[0.12] lg:flex lg:gap-6" aria-hidden>
              <Mountain className="size-20 text-emerald-300" strokeWidth={1} />
              <Tent className="size-16 text-cyan-200" strokeWidth={1} />
            </div>
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-200 ring-1 ring-white/10">
                  <Sparkles size={14} className="text-emerald-300" />
                  Shift aktif · {displayName}
                </p>
                <h1 className="mt-4 text-4xl font-black leading-[1.1] tracking-tight lg:text-[2.75rem]">
                  Sewa alat outdoor
                  <span className="block bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                    cepat & transparan
                  </span>
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-400">
                  Tarif di etalase = hari pertama per unit. Perpanjangan hari otomatis +20% per hari tambahan.
                  Denda keterlambatan diproses saat barang kembali di menu Pengembalian.
                </p>
              </div>
              <div className="grid w-full max-w-md grid-cols-2 gap-3 sm:grid-cols-3 lg:max-w-lg">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-emerald-300/90">
                    <Package size={16} />
                    <p className="text-[0.65rem] font-black uppercase tracking-wider text-slate-500">Katalog</p>
                  </div>
                  <p className="mt-2 text-2xl font-black tabular-nums">{products.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-amber-300/90">
                    <TriangleAlert size={16} />
                    <p className="text-[0.65rem] font-black uppercase tracking-wider text-slate-500">Stok tipis</p>
                  </div>
                  <p className="mt-2 text-2xl font-black tabular-nums">{lowStockProducts}</p>
                </div>
                <div className="col-span-2 rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 to-cyan-500/15 p-4 sm:col-span-1">
                  <p className="text-[0.65rem] font-black uppercase tracking-wider text-emerald-100/80">
                    Total order
                  </p>
                  <p className="mt-2 text-lg font-black leading-tight text-white tabular-nums">
                    {formatCurrency(cart.length ? grandTotal : 0)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCartSidebarOpen((current) => !current)}
                  className="col-span-2 flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm font-black text-white transition hover:bg-white/15 sm:col-span-3"
                >
                  {cartSidebarOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                  {cartSidebarOpen ? "Sembunyikan panel sewa" : "Tampilkan panel sewa"}
                </button>
              </div>
            </div>
          </header>

          {notice ? (
            <div
              className={clsx(
                "flex items-center gap-3 rounded-3xl border p-4 text-sm font-semibold",
                notice.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700",
              )}
            >
              {notice.type === "success" ? <CheckCircle2 size={19} /> : <TriangleAlert size={19} />}
              {notice.message}
            </div>
          ) : null}

          <div className="rounded-[2rem] border border-slate-200/80 bg-white p-4 shadow-lg shadow-slate-200/50 ring-1 ring-slate-100">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <label className="relative flex-1">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600/70"
                  size={20}
                  strokeWidth={2.25}
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari tenda, carrier, kompor..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/15"
                />
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1 lg:max-w-[55%]">
                <button
                  type="button"
                  onClick={() => setActiveCategory("all")}
                  className={clsx(
                    "min-w-max rounded-2xl px-4 py-3 text-sm font-bold transition",
                    activeCategory === "all"
                      ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-md shadow-emerald-900/20"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  )}
                >
                  Semua
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategory(category.id)}
                    className={clsx(
                      "min-w-max rounded-2xl px-4 py-3 text-sm font-bold transition",
                      activeCategory === category.id
                        ? "bg-slate-950 text-white shadow-md"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-900",
                    )}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredProducts.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} onAdd={addToCart} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/80 px-8 py-20 text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-slate-100">
                <Search className="text-slate-400" size={28} strokeWidth={1.75} />
              </div>
              <p className="text-lg font-black text-slate-800">Tidak ada alat di filter ini</p>
              <p className="mt-2 max-w-sm text-sm text-slate-500">
                Ubah kata kunci atau kategori. Pastikan master produk sudah mengikuti etalage toko.
              </p>
            </div>
          )}
        </section>

        {cartSidebarOpen ? (
          <div className="lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]">
            <div className="mb-3 flex justify-end lg:hidden">
              <button
                type="button"
                onClick={() => setCartSidebarOpen(false)}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-800 shadow-sm"
              >
                <PanelRightClose size={16} />
                Tutup panel
              </button>
            </div>
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
              multiDayExtraAmount={multiDayExtraAmount}

              mixedCategoryWarning={mixedCategoryWarning}
              renterIdType={renterIdType}
              renterIdNumber={renterIdNumber}
              onRenterIdTypeChange={setRenterIdType}
              onRenterIdNumberChange={setRenterIdNumber}
              baseTotalPrice={baseTotalPrice}
              lateFeeAmount={lateFeeAmount}
              grandTotal={grandTotal}
              paidAmount={0}
              paymentMethod="cash"
              isCheckingOut={false}
              onPaidAmountChange={() => {}}
              onPaymentMethodChange={() => {}}
              onIncrease={increaseQty}
              onDecrease={decreaseQty}
              onRemove={removeFromCart}
              onCheckout={handleCheckout}
              showPaymentFields={false}
              showOrderDetails={false}
            />
          </div>
        ) : null}
      </div>

      {!cartSidebarOpen && (
        <button
          key={cart.reduce((sum, item) => sum + item.qty, 0)}
          type="button"
          onClick={() => setCartSidebarOpen(true)}
          className={clsx(
            "fixed bottom-6 right-6 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl shadow-emerald-500/40 lg:hidden animate-ping-scale",
            cart.length > 0 ? "animate-bounce-subtle" : "animate-in fade-in zoom-in"
          )}
        >
          <div className="relative">
            <ShoppingCart size={24} strokeWidth={2.5} />
            {cart.length > 0 && (
              <span className="absolute -right-3 -top-3 flex size-6 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black ring-2 ring-white">
                {cart.reduce((sum, item) => sum + item.qty, 0)}
              </span>
            )}
          </div>
        </button>
      )}
    </AppShell>
  );
}
