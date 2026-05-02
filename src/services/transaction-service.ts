import {
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { demoTransactions } from "@/lib/demo-data";
import {
  buildDateKey,
  buildMonthKey,
  DEFAULT_BRANCH_ID,
  isDemoTenant,
  productDoc,
  transactionDoc,
  transactionsCol,
} from "@/lib/tenant";
import type {
  CheckoutPayload,
  PosTransaction,
  TransactionUpdateInput,
} from "@/types/pos";

const expandTransaction = (raw: Record<string, unknown>, id: string): PosTransaction => ({
  id,
  invoiceCode: String(raw.invoiceCode ?? ""),
  branchId: String(raw.branchId ?? DEFAULT_BRANCH_ID),
  userId: String(raw.userId ?? raw.cashierId ?? ""),
  userName: String(raw.userName ?? raw.cashierName ?? ""),
  totalPrice: Number(raw.totalPrice ?? 0),
  paidAmount: Number(raw.paidAmount ?? 0),
  changeAmount: Number(raw.changeAmount ?? 0),
  paymentMethod: (raw.paymentMethod as PosTransaction["paymentMethod"]) ?? "cash",
  status: (raw.status as PosTransaction["status"]) ?? "completed",
  items: Array.isArray(raw.items) ? (raw.items as PosTransaction["items"]) : [],
  dateKey: typeof raw.dateKey === "string" ? raw.dateKey : undefined,
  monthKey: typeof raw.monthKey === "string" ? raw.monthKey : undefined,
  createdAt: (raw.createdAt as PosTransaction["createdAt"]) ?? null,
  updatedAt: (raw.updatedAt as PosTransaction["updatedAt"]) ?? null,
});

const generateInvoiceCode = () => {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replaceAll("-", "");
  return `INV-${datePart}-${date.getTime().toString().slice(-6)}`;
};

export const subscribeTransactions = (
  tenantId: string,
  callback: (transactions: PosTransaction[]) => void,
  options?: { maxItems?: number; branchId?: string; cashierId?: string },
): Unsubscribe => {
  if (!isFirebaseConfigured || isDemoTenant(tenantId)) {
    callback(demoTransactions);
    return () => undefined;
  }

  const filters = [];
  if (options?.branchId && options.branchId !== "*") {
    filters.push(where("branchId", "==", options.branchId));
  }
  if (options?.cashierId) {
    filters.push(where("userId", "==", options.cashierId));
  }

  const transactionsQuery = query(
    transactionsCol(tenantId),
    ...filters,
    orderBy("createdAt", "desc"),
    limit(options?.maxItems ?? 50),
  );

  return onSnapshot(
    transactionsQuery,
    (snapshot) => {
      callback(snapshot.docs.map((document) => expandTransaction(document.data(), document.id)));
    },
    (error) => {
      console.warn("Gagal memuat transaksi:", error.message);
      callback([]);
    },
  );
};

export const getTransactions = async (
  tenantId: string,
  maxItems = 100,
): Promise<PosTransaction[]> => {
  if (!isFirebaseConfigured || isDemoTenant(tenantId)) return demoTransactions;

  const snapshot = await getDocs(
    query(transactionsCol(tenantId), orderBy("createdAt", "desc"), limit(maxItems)),
  );
  return snapshot.docs.map((document) => expandTransaction(document.data(), document.id));
};

export const checkout = async (
  tenantId: string,
  payload: CheckoutPayload,
): Promise<string> => {
  if (!payload.cart.length) throw new Error("Keranjang masih kosong.");
  if (payload.paidAmount < payload.totalPrice) {
    throw new Error("Nominal bayar kurang dari total belanja.");
  }

  for (const item of payload.cart) {
    if (item.qty > item.stock) {
      throw new Error(`Stok ${item.name} tidak mencukupi.`);
    }
  }

  if (!isFirebaseConfigured || isDemoTenant(tenantId)) {
    return generateInvoiceCode();
  }

  const invoiceCode = generateInvoiceCode();
  const transactionRef = doc(transactionsCol(tenantId));
  const branchId = payload.branchId || DEFAULT_BRANCH_ID;
  const now = new Date();

  await runTransaction(db, async (firestoreTransaction) => {
    const productRefs = payload.cart.map((item) => productDoc(tenantId, item.productId));
    const productSnapshots = await Promise.all(
      productRefs.map((productRef) => firestoreTransaction.get(productRef)),
    );

    payload.cart.forEach((item, index) => {
      const productSnapshot = productSnapshots[index];
      if (!productSnapshot.exists()) {
        throw new Error(`Produk ${item.name} tidak ditemukan.`);
      }
      const data = productSnapshot.data();
      const stockMap = (data?.stockByBranch as Record<string, number> | undefined) ?? {};
      const branchStock = Number(
        stockMap[branchId] ?? data?.totalStock ?? data?.stock ?? 0,
      );
      if (branchStock < item.qty) {
        throw new Error(`Stok ${item.name} tersisa ${branchStock}.`);
      }
    });

    payload.cart.forEach((item, index) => {
      firestoreTransaction.update(productRefs[index], {
        [`stockByBranch.${branchId}`]: increment(-item.qty),
        totalStock: increment(-item.qty),
        updatedAt: serverTimestamp(),
      });
    });

    firestoreTransaction.set(transactionRef, {
      invoiceCode,
      branchId,
      userId: payload.userId,
      userName: payload.userName,
      totalPrice: payload.totalPrice,
      paidAmount: payload.paidAmount,
      changeAmount: payload.paidAmount - payload.totalPrice,
      paymentMethod: payload.paymentMethod,
      status: "completed",
      items: payload.cart.map((item) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        qty: item.qty,
        subtotal: item.subtotal,
      })),
      dateKey: buildDateKey(now),
      monthKey: buildMonthKey(now),
      createdAt: serverTimestamp(),
    });
  });

  return invoiceCode;
};

export const updateTransaction = async (
  tenantId: string,
  transactionId: string,
  payload: TransactionUpdateInput,
) => {
  if (!isFirebaseConfigured || isDemoTenant(tenantId)) {
    throw new Error("Firebase belum dikonfigurasi. Isi .env.local untuk mengubah transaksi.");
  }

  const transactionRef = transactionDoc(tenantId, transactionId);
  const transactionSnapshot = await getDoc(transactionRef);

  if (!transactionSnapshot.exists()) {
    throw new Error("Transaksi tidak ditemukan.");
  }

  if (payload.paidAmount < 0) {
    throw new Error("Nominal dibayar tidak boleh kurang dari 0.");
  }

  const totalPrice = Number(transactionSnapshot.data().totalPrice ?? 0);
  if (payload.paidAmount < totalPrice) {
    throw new Error("Nominal dibayar kurang dari total transaksi.");
  }

  return updateDoc(transactionRef, {
    paidAmount: payload.paidAmount,
    changeAmount: payload.paidAmount - totalPrice,
    paymentMethod: payload.paymentMethod,
    updatedAt: serverTimestamp(),
  });
};
