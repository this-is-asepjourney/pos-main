"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  PanelRightClose,
  PanelRightOpen,
  Search,
  ShoppingCart,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CartPanel } from "@/components/cart-panel";
import { ProductCard } from "@/components/product-card";
import { SuccessPopup } from "@/components/success-popup";
import { useAuth } from "@/components/app-provider";
import { formatCurrency } from "@/lib/format";
import { checkout } from "@/services/transaction-service";
import { getProducts, getCategories } from "@/services/product-service";
import type { CartItem, Category, PaymentMethod, Product } from "@/types/pos";
import { clsx } from "clsx";

export default function CashierPage() {
  const { user, displayName, tenantId, branchActive } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [successPopup, setSuccessPopup] = useState("");
  const [cartSidebarOpen, setCartSidebarOpen] = useState(true);

  const fetchData = async () => {
    if (!tenantId) return;
    try {
      const [prods, cats] = await Promise.all([getProducts(), getCategories()]);
      setProducts(prods);
      setCategories(cats);
    } catch (error) {
      console.error("Gagal memuat data:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(query.toLowerCase());
      const matchesCategory =
        activeCategory === "all" || product.categoryId === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [activeCategory, products, query]);

  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const effectivePaidAmount = paymentMethod === "qris" ? total : paidAmount;
  const lowStockProducts = products.filter((product) => product.stock <= 10).length;

  const addToCart = (product: Product) => {
    setNotice(null);
    setCartSidebarOpen(true);
    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return currentCart;
        return currentCart.map((item) =>
          item.productId === product.id
            ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * item.price }
            : item,
        );
      }

      return [
        ...currentCart,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          qty: 1,
          stock: product.stock,
          subtotal: product.price,
          categoryName: product.categoryName,
          imageUrl: product.imageUrl,
        },
      ];
    });
  };

  const increaseQty = (productId: string) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.productId === productId && item.qty < item.stock
          ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * item.price }
          : item,
      ),
    );
  };

  const decreaseQty = (productId: string) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.productId === productId
            ? { ...item, qty: item.qty - 1, subtotal: (item.qty - 1) * item.price }
            : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const handleCheckout = async () => {
    if (!tenantId) {
      setNotice({ type: "error", message: "Tenant aktif belum dipilih." });
      return;
    }
    setIsCheckingOut(true);
    setNotice(null);

    try {
      const invoiceCode = await checkout({
        cart,
        totalPrice: total,
        paidAmount: effectivePaidAmount,
        paymentMethod,
        userId: user?.uid ?? "demo-admin",
        userName: displayName,
        branchId: branchActive,
      });
      const successMessage = `Transaksi ${invoiceCode} berhasil disimpan.`;
      setNotice({ type: "success", message: successMessage });
      setSuccessPopup(successMessage);
      setCart([]);
      setPaidAmount(0);
      // Refresh produk setelah checkout untuk update stok
      fetchData();
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Checkout gagal diproses.",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <AppShell allowedRoles={["owner", "admin", "cashier"]}>
      <SuccessPopup message={successPopup} onClose={() => setSuccessPopup("")} />
      {!cartSidebarOpen ? (
        <button
          type="button"
          onClick={() => setCartSidebarOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-2xl shadow-slate-950/25 transition hover:bg-cyan-600"
        >
          <ShoppingCart size={18} />
          Keranjang {cart.length ? `(${cart.length})` : ""}
        </button>
      ) : null}
      <div
        className={clsx(
          "grid min-h-screen gap-5 p-4 xl:p-6",
          cartSidebarOpen ? "xl:grid-cols-[1fr_430px]" : "xl:grid-cols-1",
        )}
      >
        <section className="min-w-0 space-y-5">
          <header className="overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/15">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-cyan-200">
                  <Sparkles size={16} />
                  Shift aktif - {displayName}
                </p>
                <h1 className="mt-3 max-w-2xl text-4xl font-black tracking-tight lg:text-5xl">
                  Kasir cepat dengan stok real-time.
                </h1>
                <p className="mt-3 max-w-xl text-slate-300">
                  Cari produk, susun cart, hitung pembayaran, dan simpan transaksi
                  dengan flow yang ringkas untuk operasional harian.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-3xl bg-white/10 p-4">
                  <p className="text-xs text-slate-400">Produk</p>
                  <p className="mt-2 text-2xl font-black">{products.length}</p>
                </div>
                <div className="rounded-3xl bg-white/10 p-4">
                  <p className="text-xs text-slate-400">Stok rendah</p>
                  <p className="mt-2 text-2xl font-black">{lowStockProducts}</p>
                </div>
                <div className="rounded-3xl bg-cyan-400 p-4 text-slate-950">
                  <p className="text-xs font-bold">Total cart</p>
                  <p className="mt-2 text-lg font-black">{formatCurrency(total)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCartSidebarOpen((current) => !current)}
                  className="col-span-2 flex items-center justify-center gap-2 rounded-3xl border border-white/10 bg-white/10 p-4 text-sm font-black text-white transition hover:bg-white/15 sm:col-span-3"
                >
                  {cartSidebarOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                  {cartSidebarOpen ? "Hide Keranjang" : "Tampilkan Keranjang"}
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

          <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row">
              <label className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari nama produk..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 font-semibold outline-none ring-cyan-200 transition focus:border-cyan-300 focus:ring-4"
                />
              </label>
              <div className="flex gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveCategory("all")}
                  className={clsx(
                    "min-w-max rounded-2xl px-4 py-3 text-sm font-bold transition",
                    activeCategory === "all"
                      ? "bg-slate-950 text-white"
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
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                    )}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={addToCart} />
            ))}
          </div>
        </section>

        {cartSidebarOpen ? (
          <div className="xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)]">
            <div className="mb-3 flex justify-end xl:hidden">
              <button
                type="button"
                onClick={() => setCartSidebarOpen(false)}
                className="flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white"
              >
                <PanelRightClose size={16} />
                Hide Keranjang
              </button>
            </div>
            <CartPanel
              cart={cart}
              paidAmount={effectivePaidAmount}
              paymentMethod={paymentMethod}
              isCheckingOut={isCheckingOut}
              onPaidAmountChange={setPaidAmount}
              onPaymentMethodChange={(method) => {
                setPaymentMethod(method);
                setPaidAmount(0);
              }}
              onIncrease={increaseQty}
              onDecrease={decreaseQty}
              onRemove={(productId) =>
                setCart((currentCart) => currentCart.filter((item) => item.productId !== productId))
              }
              onCheckout={handleCheckout}
            />
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
