"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Boxes, Download, FileSpreadsheet, ImageUp, LoaderCircle, PackagePlus, PencilLine, Plus, RefreshCw, Save, Search, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProductImage } from "@/components/product-image";
import { SuccessPopup } from "@/components/success-popup";
import { isSiloConfigured, uploadImageToSilo } from "@/lib/silo";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  importProduct,
  restockProduct,
  subscribeCategories,
  subscribeProducts,
  updateCategory,
  updateProduct,
} from "@/services/product-service";
import type { Category, Product, ProductInput } from "@/types/pos";

const emptyForm: ProductInput = {
  name: "",
  price: 0,
  stock: 0,
  categoryId: "",
  categoryName: "",
  imageUrl: "",
  sku: "",
  barcode: "",
};

type ProductImportRow = Record<string, unknown>;

type ProductImportItem = ProductInput & {
  createdAt?: Date;
};

const normalizeHeader = (value: string) => value.trim().toUpperCase();

const getImportCell = (row: ProductImportRow, header: string) => {
  const entry = Object.entries(row).find(([key]) => normalizeHeader(key) === header);
  return entry?.[1];
};

const readStringCell = (row: ProductImportRow, header: string) => {
  const value = getImportCell(row, header);
  return value == null ? "" : String(value).trim();
};

const readNumberCell = (row: ProductImportRow, header: string) => {
  const value = getImportCell(row, header);
  if (typeof value === "number") return value;

  const normalized = String(value ?? "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ProductInput>(emptyForm);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);
  const [importingProducts, setImportingProducts] = useState(false);
  const [successPopup, setSuccessPopup] = useState("");
  const [restockProductId, setRestockProductId] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState(1);
  const [restocking, setRestocking] = useState(false);
  const [syncingPap, setSyncingPap] = useState(false);

  const handleSyncPap = async () => {
    setSyncingPap(true);
    setMessage("");
    try {
      const res = await fetch("/api/pap", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Gagal sinkronisasi dengan PAP Core");
      }
      setMessage(data.message);
      setSuccessPopup(data.message);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sinkronisasi PAP Core gagal.");
    } finally {
      setSyncingPap(false);
    }
  };

  useEffect(() => {
    const unsubscribeProducts = subscribeProducts(setProducts);
    const unsubscribeCategories = subscribeCategories((items) => {
      setCategories(items);
      setForm((current) =>
        current.categoryId || !items.length
          ? current
          : { ...current, categoryId: items[0].id, categoryName: items[0].name },
      );
    });

    return () => {
      unsubscribeProducts();
      unsubscribeCategories();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (selectedImagePreview) {
        URL.revokeObjectURL(selectedImagePreview);
      }
    };
  }, [selectedImagePreview]);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) =>
        `${product.name} ${product.categoryName} ${product.sku ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [products, query],
  );

  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find((item) => item.id === categoryId);
    setForm((current) => ({
      ...current,
      categoryId,
      categoryName: category?.name ?? "",
    }));
  };

  const resetForm = () => {
    setEditingId(null);
    setSelectedImageFile(null);
    setSelectedImagePreview("");
    setForm({
      ...emptyForm,
      categoryId: categories[0]?.id ?? "",
      categoryName: categories[0]?.name ?? "",
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setSavingProduct(true);

    try {
      const imageUrl = selectedImageFile ? await uploadImageToSilo(selectedImageFile) : form.imageUrl;
      const payload: ProductInput = {
        ...form,
        imageUrl,
        sku: form.sku?.trim() ?? "",
        barcode: form.barcode?.trim() ?? "",
      };

      if (editingId) {
        await updateProduct(editingId, payload);
        const successMessage = "Produk berhasil diperbarui.";
        setMessage(successMessage);
        setSuccessPopup(successMessage);
      } else {
        await createProduct(payload);
        const successMessage = "Produk berhasil ditambahkan.";
        setMessage(successMessage);
        setSuccessPopup(successMessage);
      }
      resetForm();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Produk gagal disimpan.");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleSubmitCategory = async () => {
    if (!categoryName.trim()) return;
    setMessage("");

    try {
      if (editingCategoryId) {
        await updateCategory(editingCategoryId, categoryName.trim());
        setMessage("Kategori berhasil diperbarui.");
      } else {
        await createCategory(categoryName.trim());
        setMessage("Kategori berhasil ditambahkan.");
      }
      setCategoryName("");
      setEditingCategoryId(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kategori gagal disimpan.");
    }
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setSelectedImageFile(null);
    setSelectedImagePreview("");
    setForm({
      name: product.name,
      price: product.price,
      stock: product.stock,
      categoryId: product.categoryId,
      categoryName: product.categoryName,
      imageUrl: product.imageUrl ?? "",
      sku: product.sku ?? "",
      barcode: product.barcode ?? "",
    });
  };

  const startRestock = (product: Product) => {
    setRestockProductId(product.id);
    setRestockQty(1);
    setMessage("");
  };

  const cancelRestock = () => {
    setRestockProductId(null);
    setRestockQty(1);
  };

  const handleRestock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!restockProductId) return;

    setRestocking(true);
    setMessage("");

    try {
      await restockProduct(restockProductId, restockQty);
      const product = products.find((item) => item.id === restockProductId);
      const successMessage = `${product?.name ?? "Produk"} berhasil direstock +${Math.floor(restockQty)} stok.`;
      setMessage(successMessage);
      setSuccessPopup(successMessage);
      cancelRestock();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Restock produk gagal.");
    } finally {
      setRestocking(false);
    }
  };

  const handleSelectImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage("");
    setSelectedImageFile(file);
    setSelectedImagePreview(URL.createObjectURL(file));
    setForm((current) => ({ ...current, imageUrl: "" }));
  };

  const handleImportProducts = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage("");
    setImportingProducts(true);

    try {
      const xlsx = await import("xlsx");
      const workbook = xlsx.read(await file.arrayBuffer(), { cellDates: true, type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      if (!worksheet) {
        throw new Error("Sheet pertama tidak ditemukan.");
      }

      const rows = xlsx.utils.sheet_to_json<ProductImportRow>(worksheet, { defval: "" });
      if (!rows.length) {
        throw new Error("File Excel kosong.");
      }

      const headers = Object.keys(rows[0]).map(normalizeHeader);
      const requiredHeaders = ["PRODUK", "KATEGORI", "STOK", "HARGA"];
      const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));

      if (missingHeaders.length) {
        throw new Error(`Header wajib tidak ditemukan: ${missingHeaders.join(", ")}.`);
      }

      const parseDateCell = (value: unknown) => {
        if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
        if (typeof value === "number") {
          const parsed = xlsx.SSF.parse_date_code(value);
          if (!parsed) return undefined;
          return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, Math.floor(parsed.S));
        }

        const text = String(value ?? "").trim();
        if (!text) return undefined;

        const date = new Date(text);
        return Number.isNaN(date.getTime()) ? undefined : date;
      };

      const importItems = rows
        .map<ProductImportItem | null>((row, index) => {
          const name = readStringCell(row, "PRODUK");
          const categoryName = readStringCell(row, "KATEGORI");
          const stock = Math.max(0, Math.floor(readNumberCell(row, "STOK")));
          const price = Math.max(0, readNumberCell(row, "HARGA"));
          const createdAt = parseDateCell(getImportCell(row, "DIBUAT"));

          if (!name && !categoryName) return null;
          if (!name) throw new Error(`Baris ${index + 2}: PRODUK wajib diisi.`);
          if (!categoryName) throw new Error(`Baris ${index + 2}: KATEGORI wajib diisi.`);
          if (price <= 0) throw new Error(`Baris ${index + 2}: HARGA harus lebih dari 0.`);

          const item: ProductImportItem = {
            name,
            categoryId: "",
            categoryName,
            stock,
            price,
            sku: readStringCell(row, "SKU"),
            barcode: "",
            imageUrl: "",
          };

          return createdAt ? { ...item, createdAt } : item;
        })
        .filter((item): item is ProductImportItem => Boolean(item));

      if (!importItems.length) {
        throw new Error("Tidak ada produk valid untuk diimport.");
      }

      const categoryMap = new Map(
        categories.map((category) => [category.name.trim().toLowerCase(), category]),
      );

      for (const item of importItems) {
        const categoryKey = item.categoryName.trim().toLowerCase();
        let category = categoryMap.get(categoryKey);

        if (!category) {
          const categoryRef = await createCategory(item.categoryName);
          category = {
            id: categoryRef.id,
            name: item.categoryName,
            createdAt: new Date(),
          };
          categoryMap.set(categoryKey, category);
        }

        await importProduct(
          {
            name: item.name,
            price: item.price,
            stock: item.stock,
            categoryId: category.id,
            categoryName: category.name,
            imageUrl: item.imageUrl,
            sku: item.sku,
            barcode: item.barcode,
          },
          item.createdAt,
        );
      }

      setMessage(`${importItems.length} produk berhasil diimport dari Excel.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import produk gagal.");
    } finally {
      setImportingProducts(false);
      event.target.value = "";
    }
  };

  const handleDownloadTemplate = async () => {
    const xlsx = await import("xlsx");
    const worksheet = xlsx.utils.aoa_to_sheet([
      ["PRODUK", "KATEGORI", "SKU", "STOK", "HARGA", "DIBUAT"],
      ["Contoh Kopi Susu", "Minuman", "KS-001", 25, 18000, "2026-04-29"],
      ["Contoh Roti Bakar", "Makanan", "RB-001", 12, 15000, "2026-04-29"],
    ]);

    worksheet["!cols"] = [
      { wch: 28 },
      { wch: 20 },
      { wch: 16 },
      { wch: 10 },
      { wch: 14 },
      { wch: 16 },
    ];

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Template Produk");
    xlsx.writeFile(workbook, "template-import-produk-bro-pos.xlsx");
  };

  return (
    <AppShell allowedRoles={["admin"]}>
      <SuccessPopup message={successPopup} onClose={() => setSuccessPopup("")} />
      <div className="grid gap-6 p-4 xl:grid-cols-[410px_1fr] xl:p-6">
        <section className="space-y-4">
          <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-cyan-200">
              <Boxes size={17} />
              Inventory
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Manajemen produk</h1>
            <p className="mt-2 text-sm text-slate-300">
              Kelola menu, harga, stok, SKU, barcode, dan kategori yang disimpan ke database PostgreSQL.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">
              {editingId ? "Edit produk" : "Tambah produk"}
            </h2>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Nama produk"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-300"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min={0}
                value={form.price || ""}
                onChange={(event) => setForm((current) => ({ ...current, price: Number(event.target.value) }))}
                placeholder="Harga"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-300"
                required
              />
              <input
                type="number"
                min={0}
                value={form.stock || ""}
                onChange={(event) => setForm((current) => ({ ...current, stock: Number(event.target.value) }))}
                placeholder="Stok"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-300"
                required
              />
            </div>
            <select
              value={form.categoryId}
              onChange={(event) => handleCategoryChange(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-300"
              required
            >
              <option value="">Pilih kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={form.sku ?? ""}
                onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))}
                placeholder="SKU (opsional)"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-300"
              />
              <input
                value={form.barcode ?? ""}
                onChange={(event) => setForm((current) => ({ ...current, barcode: event.target.value }))}
                placeholder="Barcode (opsional)"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-300"
              />
            </div>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-700">
                {savingProduct && selectedImageFile ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" />
                    Uploading saat simpan...
                  </>
                ) : (
                  <>
                    <ImageUp size={16} />
                    Pilih Gambar Produk
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  disabled={savingProduct || !isSiloConfigured}
                  onChange={handleSelectImage}
                  className="hidden"
                />
              </label>
              {!isSiloConfigured ? (
                <p className="mt-2 text-xs font-semibold text-amber-700">
                  Penyimpanan Silo belum aktif. Konfigurasi env Silo agar gambar bisa diupload.
                </p>
              ) : null}
              {selectedImagePreview || form.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedImagePreview || form.imageUrl}
                  alt="Preview produk"
                  className="mt-3 h-32 w-full rounded-xl object-cover"
                />
              ) : null}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savingProduct}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingProduct ? <LoaderCircle size={18} className="animate-spin" /> : <Save size={18} />}
                {savingProduct ? "Menyimpan..." : "Simpan"}
              </button>
              {editingId ? (
                <button type="button" onClick={resetForm} className="rounded-2xl bg-slate-100 px-4 py-3 font-bold text-slate-700">
                  Batal
                </button>
              ) : null}
            </div>
          </form>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <FileSpreadsheet size={22} />
              </span>
              <div>
                <h2 className="text-xl font-black text-slate-950">Import produk Excel</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Upload file `.xlsx` / `.xls` dengan header: PRODUK, KATEGORI, SKU, STOK, HARGA, DIBUAT.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
              >
                <Download size={16} />
                Download Template
              </button>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">
                {importingProducts ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" />
                    Mengimport produk...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet size={16} />
                    Pilih File Excel
                  </>
                )}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  disabled={importingProducts}
                  onChange={handleImportProducts}
                  className="hidden"
                />
              </label>
            </div>
            <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs font-semibold text-slate-500">
              Format contoh: `PRODUK | KATEGORI | SKU | STOK | HARGA | DIBUAT`.
              Kolom SKU dan DIBUAT boleh kosong.
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSyncPap}
                disabled={syncingPap}
                className="flex items-center justify-center gap-2 rounded-2xl border border-cyan-300 bg-cyan-50 px-4 py-3 text-sm font-black text-cyan-800 hover:bg-cyan-100 transition-colors"
              >
                <RefreshCw size={16} className={syncingPap ? "animate-spin" : ""} />
                {syncingPap ? "Menyinkronkan dari PAP Core..." : "Tarik Produk dari PAP Core (Stock UMKM)"}
              </button>
              <p className="text-center text-xs text-slate-400">
                Terhubung ke Personal API Platform untuk integrasi inventori homelab.
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Kategori</h2>
            <div className="mt-4 flex gap-2">
              <input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="Nama kategori"
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-300"
              />
              <button type="button" onClick={handleSubmitCategory} className="rounded-2xl bg-cyan-400 px-4 py-3 font-black text-slate-950">
                <Plus size={18} />
              </button>
              {editingCategoryId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategoryId(null);
                    setCategoryName("");
                  }}
                  className="rounded-2xl bg-slate-100 px-4 py-3 font-bold text-slate-700"
                >
                  Batal
                </button>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((category) => (
                <div key={category.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-sm font-bold text-slate-700">
                  <span className="px-1">{category.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategoryId(category.id);
                      setCategoryName(category.name);
                    }}
                    className="rounded-full p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                    aria-label={`Edit kategori ${category.name}`}
                  >
                    <PencilLine size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      deleteCategory(category.id).catch((error) =>
                        setMessage(error instanceof Error ? error.message : "Kategori gagal dihapus."),
                      )
                    }
                    className="rounded-full p-1 text-rose-600 hover:bg-rose-100"
                    aria-label={`Hapus kategori ${category.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {message ? (
            <div className="rounded-3xl bg-cyan-50 p-4 text-sm font-semibold text-cyan-800">
              {message}
            </div>
          ) : null}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">Daftar produk</h2>
              <p className="text-sm text-slate-500">{filteredProducts.length} produk tampil</p>
            </div>
            <label className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari produk..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 outline-none focus:border-cyan-300 lg:w-80"
              />
            </label>
          </div>

          <div className="mt-5 space-y-3 md:hidden">
            {filteredProducts.map((product) => (
              <div key={product.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <ProductImage
                      src={product.imageUrl}
                      name={product.name}
                      className="size-16 rounded-2xl"
                    />
                    <div className="min-w-0">
                      <p className="text-base font-black text-slate-950">{product.name}</p>
                      <p className="text-xs font-semibold text-slate-500">{product.categoryName}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">
                    Stok {product.stock}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
                  <p>SKU: {product.sku ?? "-"}</p>
                  <p className="text-right">{formatCurrency(product.price)}</p>
                  <p className="col-span-2">Dibuat: {formatDateTime(product.createdAt)}</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(product)}
                    className="flex-1 rounded-xl bg-slate-200 px-3 py-2 text-sm font-bold text-slate-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => startRestock(product)}
                    className="rounded-xl bg-emerald-100 px-3 py-2 font-bold text-emerald-700"
                  >
                    <PackagePlus size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      deleteProduct(product.id).catch((error) =>
                        setMessage(error instanceof Error ? error.message : "Produk gagal dihapus."),
                      )
                    }
                    className="rounded-xl bg-rose-100 px-3 py-2 font-bold text-rose-700"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                {restockProductId === product.id ? (
                  <form onSubmit={handleRestock} className="mt-3 rounded-2xl bg-white p-3">
                    <p className="text-sm font-black text-slate-950">Restock {product.name}</p>
                    <div className="mt-2 flex gap-2">
                      <input
                        type="number"
                        min={1}
                        value={restockQty || ""}
                        onChange={(event) => setRestockQty(Number(event.target.value))}
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold outline-none focus:border-emerald-300"
                        required
                      />
                      <button
                        type="submit"
                        disabled={restocking}
                        className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-black text-white disabled:opacity-60"
                      >
                        {restocking ? "..." : "Tambah"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelRestock}
                        className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600"
                      >
                        Batal
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-5 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[840px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="py-3">Produk</th>
                  <th>Kategori</th>
                  <th>SKU</th>
                  <th>Stok</th>
                  <th>Harga</th>
                  <th>Dibuat</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="font-semibold text-slate-700">
                    <td className="py-4 text-slate-950">
                      <div className="flex items-center gap-3">
                        <ProductImage
                          src={product.imageUrl}
                          name={product.name}
                          className="size-12 rounded-2xl"
                        />
                        <div>
                          <p className="font-black">{product.name}</p>
                          <p className="text-xs font-semibold text-slate-400">
                            {product.imageUrl ? "Foto tersedia" : "Belum ada foto"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>{product.categoryName}</td>
                    <td>{product.sku ?? "-"}</td>
                    <td>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                        {product.stock}
                      </span>
                    </td>
                    <td className="font-black text-slate-950">{formatCurrency(product.price)}</td>
                    <td>{formatDateTime(product.createdAt)}</td>
                    <td className="text-right">
                      <button type="button" onClick={() => startEdit(product)} className="rounded-xl bg-slate-100 px-3 py-2 font-bold text-slate-700">
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => startRestock(product)}
                        className="ml-2 rounded-xl bg-emerald-50 px-3 py-2 font-bold text-emerald-700"
                      >
                        Restock
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProduct(product.id).catch((error) => setMessage(error.message))}
                        className="ml-2 rounded-xl bg-rose-50 px-3 py-2 font-bold text-rose-700"
                      >
                        <Trash2 size={15} />
                      </button>
                      {restockProductId === product.id ? (
                        <form
                          onSubmit={handleRestock}
                          className="mt-3 flex justify-end gap-2"
                        >
                          <input
                            type="number"
                            min={1}
                            value={restockQty || ""}
                            onChange={(event) => setRestockQty(Number(event.target.value))}
                            className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold outline-none focus:border-emerald-300"
                            required
                          />
                          <button
                            type="submit"
                            disabled={restocking}
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-black text-white disabled:opacity-60"
                          >
                            {restocking ? "..." : "Tambah"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelRestock}
                            className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600"
                          >
                            Batal
                          </button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
