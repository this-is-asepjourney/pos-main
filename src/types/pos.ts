import type { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "cashier";

export type FirestoreDate = Date | Timestamp | string | null;

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
  specification?: string;
  notes?: string;
  price: number;
  stock: number;
  categoryIds?: string[];
  categoryNames?: string[];
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
  specification?: string;
  notes?: string;
  price: number;
  stock: number;
  categoryIds?: string[];
  categoryNames?: string[];
  categoryId: string;
  categoryName: string;
  imageUrl?: string;
  sku?: string;
  barcode?: string;
};

export type CartItem = {
  productId: string;
  name: string;
  specification?: string;
  notes?: string;
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
  specification?: string;
  notes?: string;
  price: number;
  qty: number;
  subtotal: number;
  categoryName?: string;
};

export type RenterIdType = "ktp" | "sim" | "";
export type RentalStatus = "rented" | "overdue" | "returned";
export type RentalChecklist = {
  condition: string;
  accessories: string;
  photoNotes: string;
};

export type PaymentMethod = "cash" | "qris" | "debit";

export type PosTransaction = {
  id: string;
  invoiceCode: string;
  userId: string;
  userName: string;
  /** Total sewa setelah hari sewa + pengali khusus (mis. 28–31 Des), sebelum denda keterlambatan. */
  baseTotalPrice?: number;
  rentalDays?: number;
  pickupDate?: string;
  returnDueDate?: string;
  actualReturnDate?: string;
  firstDaySubtotal?: number;
  /** Biaya tambahan karena tarif hari ke-2+ (+20% per hari tambahan, sebelum pengali liburan). */
  multiDayExtraAmount?: number;
  rentalSubtotalBeforeHoliday?: number;
  holidayMultiplier?: number;
  yearEndHolidayApplied?: boolean;
  renterIdType?: RenterIdType;
  renterIdNumber?: string;
  status?: RentalStatus;
  checkoutChecklist?: RentalChecklist;
  returnChecklist?: RentalChecklist;
  returnedAt?: FirestoreDate;
  lateDays?: number;
  lateFeeAmount?: number;
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

export type ReturnTransactionInput = {
  actualReturnDate: string;
  additionalPaidAmount: number;
  returnChecklist: RentalChecklist;
};

export type CheckoutPayload = {
  cart: CartItem[];
  rentalDays: number;
  pickupDate: string;
  returnDueDate: string;
  actualReturnDate: string;
  firstDaySubtotal: number;
  multiDayExtraAmount: number;
  rentalSubtotalBeforeHoliday: number;
  holidayMultiplier: number;
  yearEndHolidayApplied: boolean;
  renterIdType: RenterIdType;
  renterIdNumber: string;
  checkoutChecklist: RentalChecklist;
  baseTotalPrice: number;
  lateDays: number;
  lateFeeAmount: number;
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
