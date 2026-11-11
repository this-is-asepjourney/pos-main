export type UserRole = "admin" | "cashier";

export type FirestoreDate = Date | { toDate?: () => Date; seconds?: number } | string | null;

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: FirestoreDate;
};

export type ShiftStatus = "active" | "closed";

export type ShiftAttendance = {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  status: ShiftStatus;
  startedAt: FirestoreDate;
  endedAt?: FirestoreDate;
};

export type Category = {
  id: string;
  name: string;
  createdAt: FirestoreDate;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  categoryId: string;
  categoryName: string;
  imageUrl?: string;
  sku?: string;
  barcode?: string;
  createdAt: FirestoreDate;
  updatedAt?: FirestoreDate;
};

export type ProductInput = {
  name: string;
  price: number;
  stock: number;
  categoryId: string;
  categoryName: string;
  imageUrl?: string;
  sku?: string;
  barcode?: string;
};

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  qty: number;
  stock: number;
  subtotal: number;
  categoryName?: string;
  imageUrl?: string;
};

export type TransactionItem = {
  productId: string;
  name: string;
  price: number;
  qty: number;
  subtotal: number;
};

export type PaymentMethod = "cash" | "qris" | "debit";

export type PosTransaction = {
  id: string;
  invoiceCode: string;
  userId: string;
  userName: string;
  totalPrice: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  items: TransactionItem[];
  createdAt: FirestoreDate;
  updatedAt?: FirestoreDate;
};

export type TransactionUpdateInput = {
  paidAmount: number;
  paymentMethod: PaymentMethod;
};

export type CheckoutPayload = {
  cart: CartItem[];
  totalPrice: number;
  paidAmount: number;
  paymentMethod: PaymentMethod;
  userId: string;
  userName: string;
};

export type DashboardStats = {
  todayRevenue: number;
  todayTransactions: number;
  averageTransaction: number;
  lowStockCount: number;
  topProducts: Array<{
    name: string;
    qty: number;
    revenue: number;
  }>;
  recentTransactions: PosTransaction[];
};
