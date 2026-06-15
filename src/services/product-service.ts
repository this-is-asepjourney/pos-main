import type { Category, Product, ProductInput } from "@/types/pos";

export const getProducts = async (): Promise<Product[]> => {
  const response = await fetch("/api/products");
  if (!response.ok) throw new Error("Gagal memuat produk.");
  return response.json();
};

export const getCategories = async (): Promise<Category[]> => {
  const response = await fetch("/api/categories");
  if (!response.ok) throw new Error("Gagal memuat kategori.");
  return response.json();
};

export const createProduct = async (
  payload: ProductInput,
  branchId: string = "main",
) => {
  const response = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, branchId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Gagal menyimpan produk.");
  }
  return response.json();
};

export const importProduct = async (
  payload: ProductInput,
  branchId: string = "main",
) => {
  return createProduct(payload, branchId);
};

export const updateProduct = async (
  productId: string,
  payload: ProductInput,
  branchId: string = "main",
) => {
  const response = await fetch(`/api/products/${productId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, branchId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Gagal mengubah produk.");
  }
  return response.json();
};

export const restockProduct = async (
  productId: string,
  qty: number,
  branchId: string = "main",
) => {
  const response = await fetch(`/api/products/${productId}/restock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qty, branchId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Gagal restock produk.");
  }
  return response.json();
};

export const deleteProduct = async (productId: string) => {
  const response = await fetch(`/api/products/${productId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Gagal menghapus produk.");
  }
  return response.json();
};

export const createCategory = async (name: string) => {
  const response = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Gagal menyimpan kategori.");
  }
  return response.json();
};

export const updateCategory = async (categoryId: string, name: string) => {
  const response = await fetch(`/api/categories/${categoryId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Gagal mengubah kategori.");
  }
  return response.json();
};

export const deleteCategory = async (categoryId: string) => {
  const response = await fetch(`/api/categories/${categoryId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Gagal menghapus kategori.");
  }
  return response.json();
};
