import type { Timestamp } from "firebase/firestore";

export type TenantRole = "owner" | "admin" | "cashier";
// Backward compatibility — beberapa komponen masih memakai `UserRole`.
// Owner mewarisi semua kemampuan admin.
export type UserRole = TenantRole;

export type FirestoreDate = Date | Timestamp | string | null;

export type TenantStatus = "trial" | "active" | "suspended";

export type TenantSettings = {
  currency: "IDR";
  taxRate: number;
  timezone: string;
  receiptFooter: string;
  logoUrl?: string;
};

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  ownerUid: string;
  status: TenantStatus;
  plan: "free" | "pro" | "business";
  branchCount: number;
  settings: TenantSettings;
  createdAt: FirestoreDate;
  updatedAt?: FirestoreDate;
};

export type Branch = {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  createdAt: FirestoreDate;
};

export type Member = {
  id: string;
  uid: string;
  email: string;
  name: string;
  role: TenantRole;
  branchIds: string[];
  status: "active" | "disabled";
  joinedAt: FirestoreDate;
};

export type GlobalUser = {
  uid: string;
  email: string;
  name: string;
  defaultTenantId: string | null;
  tenantIds: string[];
  createdAt: FirestoreDate;
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: TenantRole;
  createdAt: FirestoreDate;
};

export type ShiftStatus = "active" | "closed";

export type ShiftAttendance = {
  id: string;
  userId: string;
  userName: string;
  role: TenantRole;
  branchId: string;
  status: ShiftStatus;
  openingCash?: number;
  closingCash?: number;
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
  nameLower?: string;
  price: number;
  stock: number;
  categoryId: string;
  categoryName: string;
  imageUrl?: string;
  sku?: string;
  barcode?: string;
  isActive?: boolean;
  stockByBranch?: Record<string, number>;
  totalStock?: number;
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

export type TransactionStatus = "completed" | "voided" | "refunded";

export type PosTransaction = {
  id: string;
  invoiceCode: string;
  branchId: string;
  userId: string;
  userName: string;
  totalPrice: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  items: TransactionItem[];
  dateKey?: string;
  monthKey?: string;
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
  branchId: string;
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

export type SubscriptionStatus = "trial" | "active" | "past_due" | "cancelled";

export type Subscription = {
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  trialEndsAt?: FirestoreDate;
  currentPeriodStart: FirestoreDate;
  currentPeriodEnd: FirestoreDate;
  paymentMethod?: "midtrans" | "xendit" | "manual";
  lastPaymentAt?: FirestoreDate;
  cancelledAt?: FirestoreDate;
};

export type Plan = {
  id: string;
  name: string;
  priceIDR: number;
  interval: "monthly" | "yearly";
  limits: {
    maxBranches: number;
    maxProducts: number;
    maxUsers: number;
    transactionsPerMonth: number;
  };
  features: {
    multiBranch: boolean;
    advancedReports: boolean;
    excelExport: boolean;
    apiAccess: boolean;
    loyalty: boolean;
  };
  isActive: boolean;
};
