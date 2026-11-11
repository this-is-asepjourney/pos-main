import type { Category, Product, ProductInput } from "@/types/pos";
import { demoCategories, demoProducts } from "@/lib/demo-data";

export type Unsubscribe = () => void;

export const getProducts = async (): Promise<Product[]> => {
  try {
    const res = await fetch("/api/products", { cache: "no-store" });
    if (!res.ok) throw new Error("Gagal mengambil data produk");
    return await res.json();
  } catch (err) {
    console.warn("[Product Service] Error fetching products, using demo data fallback:", err);
    return demoProducts;
  }
};

export const getCategories = async (): Promise<Category[]> => {
  try {
    const res = await fetch("/api/categories", { cache: "no-store" });
    if (!res.ok) throw new Error("Gagal mengambil data kategori");
    return await res.json();
  } catch (err) {
    console.warn("[Product Service] Error fetching categories, using demo data fallback:", err);
    return demoCategories;
  }
};

export const subscribeProducts = (callback: (products: Product[]) => void): Unsubscribe => {
  let active = true;

  const load = async () => {
    try {
      const prods = await getProducts();
      if (active) callback(prods);
    } catch {
      if (active) callback([]);
    }
  };

  load();
  const intervalId = setInterval(load, 5000);

  return () => {
    active = false;
    clearInterval(intervalId);
  };
};

export const subscribeCategories = (callback: (categories: Category[]) => void): Unsubscribe => {
  let active = true;

  const load = async () => {
    try {
      const cats = await getCategories();
      if (active) callback(cats);
    } catch {
      if (active) callback([]);
    }
  };

  load();
  const intervalId = setInterval(load, 5000);

  return () => {
    active = false;
    clearInterval(intervalId);
  };
};

export const createProduct = async (payload: ProductInput) => {
  const res = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || "Gagal menambahkan produk.");
  }

  return await res.json();
};

export const importProduct = async (payload: ProductInput, createdAt?: Date) => {
  return createProduct(payload);
};

export const updateProduct = async (productId: string, payload: ProductInput) => {
  const res = await fetch(`/api/products/${productId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || "Gagal mengupdate produk.");
  }

  return await res.json();
};

export const restockProduct = async (productId: string, qty: number) => {
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("Jumlah restock harus lebih dari 0.");
  }

  const res = await fetch(`/api/products/${productId}/restock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qty }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || "Gagal restock produk.");
  }

  return await res.json();
};

export const deleteProduct = async (productId: string) => {
  const res = await fetch(`/api/products/${productId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || "Gagal menghapus produk.");
  }

  return await res.json();
};

export const createCategory = async (name: string) => {
  const res = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || "Gagal menambahkan kategori.");
  }

  return await res.json();
};

export const updateCategory = async (categoryId: string, name: string) => {
  const res = await fetch("/api/categories", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: categoryId, name }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || "Gagal mengupdate kategori.");
  }

  return await res.json();
};

export const deleteCategory = async (categoryId: string) => {
  const res = await fetch(`/api/categories?id=${encodeURIComponent(categoryId)}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || "Gagal menghapus kategori.");
  }

  return await res.json();
};
