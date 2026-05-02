import {
  addDoc,
  deleteDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { isFirebaseConfigured } from "@/lib/firebase";
import { demoCategories, demoProducts } from "@/lib/demo-data";
import {
  categoriesCol,
  categoryDoc,
  DEFAULT_BRANCH_ID,
  isDemoTenant,
  productDoc,
  productsCol,
} from "@/lib/tenant";
import type { Category, Product, ProductInput } from "@/types/pos";

const expandProduct = (raw: Record<string, unknown>, id: string): Product => {
  const stockByBranch = (raw.stockByBranch as Record<string, number> | undefined) ?? {};
  const fallbackStock = Number(raw.stock ?? 0);
  const totalStock = Number(
    raw.totalStock ??
      Object.values(stockByBranch).reduce((sum, value) => sum + Number(value || 0), 0) ??
      fallbackStock,
  );

  return {
    id,
    name: String(raw.name ?? ""),
    nameLower: typeof raw.nameLower === "string" ? raw.nameLower : undefined,
    price: Number(raw.price ?? 0),
    stock: totalStock || fallbackStock,
    categoryId: String(raw.categoryId ?? ""),
    categoryName: String(raw.categoryName ?? ""),
    imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : undefined,
    sku: typeof raw.sku === "string" ? raw.sku : undefined,
    barcode: typeof raw.barcode === "string" ? raw.barcode : undefined,
    isActive: typeof raw.isActive === "boolean" ? raw.isActive : true,
    stockByBranch,
    totalStock: totalStock || fallbackStock,
    createdAt: (raw.createdAt as Product["createdAt"]) ?? null,
    updatedAt: (raw.updatedAt as Product["updatedAt"]) ?? null,
  };
};

const buildProductPayload = (
  payload: ProductInput,
  branchId: string,
): Record<string, unknown> => {
  const stock = Math.max(0, Math.floor(Number(payload.stock) || 0));
  return {
    name: payload.name,
    nameLower: payload.name.toLowerCase(),
    price: Number(payload.price) || 0,
    categoryId: payload.categoryId,
    categoryName: payload.categoryName,
    imageUrl: payload.imageUrl ?? "",
    sku: payload.sku ?? "",
    barcode: payload.barcode ?? "",
    isActive: true,
    stockByBranch: { [branchId]: stock },
    totalStock: stock,
  };
};

export const subscribeProducts = (
  tenantId: string,
  callback: (products: Product[]) => void,
): Unsubscribe => {
  if (!isFirebaseConfigured || isDemoTenant(tenantId)) {
    callback(demoProducts);
    return () => undefined;
  }

  const productsQuery = query(productsCol(tenantId), orderBy("name", "asc"));
  return onSnapshot(
    productsQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map((document) => expandProduct(document.data(), document.id)),
      );
    },
    (error) => {
      console.warn("Gagal memuat produk:", error.message);
      callback([]);
    },
  );
};

export const subscribeCategories = (
  tenantId: string,
  callback: (categories: Category[]) => void,
): Unsubscribe => {
  if (!isFirebaseConfigured || isDemoTenant(tenantId)) {
    callback(demoCategories);
    return () => undefined;
  }

  const categoriesQuery = query(categoriesCol(tenantId), orderBy("name", "asc"));
  return onSnapshot(
    categoriesQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map(
          (document) => ({ id: document.id, ...document.data() }) as Category,
        ),
      );
    },
    (error) => {
      console.warn("Gagal memuat kategori:", error.message);
      callback([]);
    },
  );
};

export const getProducts = async (tenantId: string): Promise<Product[]> => {
  if (!isFirebaseConfigured || isDemoTenant(tenantId)) return demoProducts;

  const snapshot = await getDocs(query(productsCol(tenantId), orderBy("name", "asc")));
  return snapshot.docs.map((document) => expandProduct(document.data(), document.id));
};

export const getCategories = async (tenantId: string): Promise<Category[]> => {
  if (!isFirebaseConfigured || isDemoTenant(tenantId)) return demoCategories;

  const snapshot = await getDocs(query(categoriesCol(tenantId), orderBy("name", "asc")));
  return snapshot.docs.map(
    (document) => ({ id: document.id, ...document.data() }) as Category,
  );
};

export const createProduct = async (
  tenantId: string,
  payload: ProductInput,
  branchId: string = DEFAULT_BRANCH_ID,
) => {
  if (!isFirebaseConfigured || isDemoTenant(tenantId)) {
    throw new Error("Firebase belum dikonfigurasi. Isi .env.local untuk menyimpan produk.");
  }

  return addDoc(productsCol(tenantId), {
    ...buildProductPayload(payload, branchId),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const importProduct = async (
  tenantId: string,
  payload: ProductInput,
  createdAt?: Date,
  branchId: string = DEFAULT_BRANCH_ID,
) => {
  if (!isFirebaseConfigured || isDemoTenant(tenantId)) {
    throw new Error("Firebase belum dikonfigurasi. Isi .env.local untuk import produk.");
  }

  return addDoc(productsCol(tenantId), {
    ...buildProductPayload(payload, branchId),
    createdAt: createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateProduct = async (
  tenantId: string,
  productId: string,
  payload: ProductInput,
  branchId: string = DEFAULT_BRANCH_ID,
) => {
  if (!isFirebaseConfigured || isDemoTenant(tenantId)) {
    throw new Error("Firebase belum dikonfigurasi. Isi .env.local untuk mengubah produk.");
  }

  return updateDoc(productDoc(tenantId, productId), {
    ...buildProductPayload(payload, branchId),
    updatedAt: serverTimestamp(),
  });
};

export const restockProduct = async (
  tenantId: string,
  productId: string,
  qty: number,
  branchId: string = DEFAULT_BRANCH_ID,
) => {
  if (!isFirebaseConfigured || isDemoTenant(tenantId)) {
    throw new Error("Firebase belum dikonfigurasi. Isi .env.local untuk restock produk.");
  }

  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("Jumlah restock harus lebih dari 0.");
  }

  const delta = Math.floor(qty);
  return updateDoc(productDoc(tenantId, productId), {
    [`stockByBranch.${branchId}`]: increment(delta),
    totalStock: increment(delta),
    updatedAt: serverTimestamp(),
  });
};

export const deleteProduct = async (tenantId: string, productId: string) => {
  if (!isFirebaseConfigured || isDemoTenant(tenantId)) {
    throw new Error("Firebase belum dikonfigurasi. Isi .env.local untuk menghapus produk.");
  }

  return deleteDoc(productDoc(tenantId, productId));
};

export const createCategory = async (tenantId: string, name: string) => {
  if (!isFirebaseConfigured || isDemoTenant(tenantId)) {
    throw new Error("Firebase belum dikonfigurasi. Isi .env.local untuk menyimpan kategori.");
  }

  return addDoc(categoriesCol(tenantId), {
    name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateCategory = async (
  tenantId: string,
  categoryId: string,
  name: string,
) => {
  if (!isFirebaseConfigured || isDemoTenant(tenantId)) {
    throw new Error("Firebase belum dikonfigurasi. Isi .env.local untuk mengubah kategori.");
  }

  return updateDoc(categoryDoc(tenantId, categoryId), {
    name,
    updatedAt: serverTimestamp(),
  });
};

export const deleteCategory = async (tenantId: string, categoryId: string) => {
  if (!isFirebaseConfigured || isDemoTenant(tenantId)) {
    throw new Error("Firebase belum dikonfigurasi. Isi .env.local untuk menghapus kategori.");
  }

  return deleteDoc(categoryDoc(tenantId, categoryId));
};
