import type { Category, PosTransaction, Product } from "@/types/pos";

const now = new Date().toISOString();

const buildDemoProduct = (
  overrides: Omit<Product, "isActive" | "stockByBranch" | "totalStock" | "nameLower"> & {
    stock: number;
  },
): Product => ({
  ...overrides,
  nameLower: overrides.name.toLowerCase(),
  isActive: true,
  stockByBranch: { main: overrides.stock },
  totalStock: overrides.stock,
});

export const demoCategories: Category[] = [
  { id: "coffee", name: "Coffee", createdAt: now },
  { id: "non-coffee", name: "Non Coffee", createdAt: now },
  { id: "food", name: "Food", createdAt: now },
  { id: "dessert", name: "Dessert", createdAt: now },
];

export const demoProducts: Product[] = [
  buildDemoProduct({
    id: "p-americano",
    name: "Americano",
    price: 20000,
    stock: 42,
    categoryId: "coffee",
    categoryName: "Coffee",
    sku: "COF-001",
    createdAt: now,
  }),
  buildDemoProduct({
    id: "p-latte",
    name: "Cafe Latte",
    price: 28000,
    stock: 30,
    categoryId: "coffee",
    categoryName: "Coffee",
    sku: "COF-002",
    createdAt: now,
  }),
  buildDemoProduct({
    id: "p-matcha",
    name: "Iced Matcha",
    price: 32000,
    stock: 18,
    categoryId: "non-coffee",
    categoryName: "Non Coffee",
    sku: "NON-001",
    createdAt: now,
  }),
  buildDemoProduct({
    id: "p-lemon-tea",
    name: "Lemon Tea",
    price: 18000,
    stock: 11,
    categoryId: "non-coffee",
    categoryName: "Non Coffee",
    sku: "NON-002",
    createdAt: now,
  }),
  buildDemoProduct({
    id: "p-croissant",
    name: "Butter Croissant",
    price: 24000,
    stock: 8,
    categoryId: "food",
    categoryName: "Food",
    sku: "FOD-001",
    createdAt: now,
  }),
  buildDemoProduct({
    id: "p-cheesecake",
    name: "Burnt Cheesecake",
    price: 35000,
    stock: 6,
    categoryId: "dessert",
    categoryName: "Dessert",
    sku: "DES-001",
    createdAt: now,
  }),
];

export const demoTransactions: PosTransaction[] = [
  {
    id: "trx-1",
    invoiceCode: "INV-DEMO-001",
    branchId: "main",
    userId: "demo-admin",
    userName: "Admin Demo",
    totalPrice: 88000,
    paidAmount: 100000,
    changeAmount: 12000,
    paymentMethod: "cash",
    status: "completed",
    items: [
      { productId: "p-latte", name: "Cafe Latte", price: 28000, qty: 2, subtotal: 56000 },
      { productId: "p-matcha", name: "Iced Matcha", price: 32000, qty: 1, subtotal: 32000 },
    ],
    dateKey: now.slice(0, 10),
    monthKey: now.slice(0, 7),
    createdAt: now,
  },
  {
    id: "trx-2",
    invoiceCode: "INV-DEMO-002",
    branchId: "main",
    userId: "demo-cashier",
    userName: "Kasir Demo",
    totalPrice: 64000,
    paidAmount: 64000,
    changeAmount: 0,
    paymentMethod: "qris",
    status: "completed",
    items: [
      { productId: "p-americano", name: "Americano", price: 20000, qty: 2, subtotal: 40000 },
      { productId: "p-croissant", name: "Butter Croissant", price: 24000, qty: 1, subtotal: 24000 },
    ],
    dateKey: now.slice(0, 10),
    monthKey: now.slice(0, 7),
    createdAt: now,
  },
];
