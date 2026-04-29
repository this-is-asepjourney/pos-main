import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { demoCategories, demoProducts } from "@/lib/demo-data";
import type { Category, Product, ProductInput } from "@/types/pos";

const productCollection = collection(db, "products");
const categoryCollection = collection(db, "categories");

export const subscribeProducts = (callback: (products: Product[]) => void): Unsubscribe => {
  if (!isFirebaseConfigured) {
    callback(demoProducts);
    return () => undefined;
  }

  const productsQuery = query(productCollection, orderBy("name", "asc"));
  return onSnapshot(
    productsQuery,
    (snapshot) => {
      callback(snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as Product));
    },
    (error) => {
      console.warn("Gagal memuat produk:", error.message);
      callback([]);
    },
  );
};

export const subscribeCategories = (callback: (categories: Category[]) => void): Unsubscribe => {
  if (!isFirebaseConfigured) {
    callback(demoCategories);
    return () => undefined;
  }

  const categoriesQuery = query(categoryCollection, orderBy("name", "asc"));
  return onSnapshot(
    categoriesQuery,
    (snapshot) => {
      callback(snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as Category));
    },
    (error) => {
      console.warn("Gagal memuat kategori:", error.message);
      callback([]);
    },
  );
};

export const getProducts = async (): Promise<Product[]> => {
  if (!isFirebaseConfigured) return demoProducts;

  const snapshot = await getDocs(query(productCollection, orderBy("name", "asc")));
  return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as Product);
};

export const getCategories = async (): Promise<Category[]> => {
  if (!isFirebaseConfigured) return demoCategories;

  const snapshot = await getDocs(query(categoryCollection, orderBy("name", "asc")));
  return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as Category);
};

export const createProduct = async (payload: ProductInput) => {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase belum dikonfigurasi. Isi .env.local untuk menyimpan produk.");
  }

  return addDoc(productCollection, {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const importProduct = async (payload: ProductInput, createdAt?: Date) => {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase belum dikonfigurasi. Isi .env.local untuk import produk.");
  }

  return addDoc(productCollection, {
    ...payload,
    createdAt: createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateProduct = async (productId: string, payload: ProductInput) => {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase belum dikonfigurasi. Isi .env.local untuk mengubah produk.");
  }

  return updateDoc(doc(db, "products", productId), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
};

export const restockProduct = async (productId: string, qty: number) => {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase belum dikonfigurasi. Isi .env.local untuk restock produk.");
  }

  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("Jumlah restock harus lebih dari 0.");
  }

  return updateDoc(doc(db, "products", productId), {
    stock: increment(Math.floor(qty)),
    updatedAt: serverTimestamp(),
  });
};

export const deleteProduct = async (productId: string) => {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase belum dikonfigurasi. Isi .env.local untuk menghapus produk.");
  }

  return deleteDoc(doc(db, "products", productId));
};

export const createCategory = async (name: string) => {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase belum dikonfigurasi. Isi .env.local untuk menyimpan kategori.");
  }

  return addDoc(categoryCollection, {
    name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateCategory = async (categoryId: string, name: string) => {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase belum dikonfigurasi. Isi .env.local untuk mengubah kategori.");
  }

  return updateDoc(doc(db, "categories", categoryId), {
    name,
    updatedAt: serverTimestamp(),
  });
};

export const deleteCategory = async (categoryId: string) => {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase belum dikonfigurasi. Isi .env.local untuk menghapus kategori.");
  }

  return deleteDoc(doc(db, "categories", categoryId));
};
