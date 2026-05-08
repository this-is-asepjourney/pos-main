import {
  collection,
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
  type Unsubscribe,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { demoTransactions } from "@/lib/demo-data";
import {
  calculateLateFee,
  cartFirstDaySubtotal,
  computeRentalLineTotal,
  computeRentalSubtotal,
  inclusiveRentalDays,
  lateDaysFromActualReturn,
} from "@/lib/rental";
import type {
  CheckoutPayload,
  PosTransaction,
  RentalStatus,
  ReturnTransactionInput,
  TransactionUpdateInput,
} from "@/types/pos";

const transactionCollection = collection(db, "transactions");

export const resolveRentalStatus = (transaction: PosTransaction, now = new Date()): RentalStatus => {
  if (transaction.actualReturnDate) return "returned";
  if (!transaction.returnDueDate) return "rented";
  const due = new Date(transaction.returnDueDate);
  if (Number.isNaN(due.getTime())) return "rented";
  return due < new Date(now.getFullYear(), now.getMonth(), now.getDate()) ? "overdue" : "rented";
};

const generateInvoiceCode = () => {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replaceAll("-", "");
  return `INV-${datePart}-${date.getTime().toString().slice(-6)}`;
};

export const subscribeTransactions = (
  callback: (transactions: PosTransaction[]) => void,
  maxItems = 50,
): Unsubscribe => {
  if (!isFirebaseConfigured) {
    callback(demoTransactions);
    return () => undefined;
  }

  const transactionsQuery = query(
    transactionCollection,
    orderBy("createdAt", "desc"),
    limit(maxItems),
  );

  return onSnapshot(
    transactionsQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as PosTransaction),
      );
    },
    (error) => {
      console.warn("Gagal memuat transaksi:", error.message);
      callback([]);
    },
  );
};

export const getTransactions = async (maxItems = 100): Promise<PosTransaction[]> => {
  if (!isFirebaseConfigured) return demoTransactions;

  const snapshot = await getDocs(query(transactionCollection, orderBy("createdAt", "desc"), limit(maxItems)));
  return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as PosTransaction);
};

const assertClose = (label: string, a: number, b: number, epsilon = 2) => {
  if (Math.abs(a - b) > epsilon) {
    throw new Error(`${label} tidak konsisten. Muat ulang halaman lalu coba lagi.`);
  }
};

export const checkout = async (payload: CheckoutPayload): Promise<string> => {
  if (!payload.cart.length) throw new Error("Keranjang masih kosong.");
  if (payload.paidAmount < payload.totalPrice) throw new Error("Nominal bayar kurang dari total belanja.");
  if (payload.lateDays < 0) throw new Error("Hari keterlambatan tidak boleh kurang dari 0.");
  if (payload.rentalDays < 1) throw new Error("Lama sewa minimal 1 hari.");
  if (!payload.pickupDate || !payload.returnDueDate) {
    throw new Error("Tanggal ambil dan tanggal kembali rencana wajib diisi.");
  }

  const pickup = payload.pickupDate.trim();
  const returnDue = payload.returnDueDate.trim();
  if ((pickup && !returnDue) || (!pickup && returnDue)) {
    throw new Error("Lengkapi tanggal ambil dan tanggal kembali rencana, atau kosongkan keduanya.");
  }
  if (pickup && returnDue) {
    const computedDays = inclusiveRentalDays(pickup, returnDue);
    assertClose("Lama sewa", computedDays, payload.rentalDays);
  }

  const actualReturn = payload.actualReturnDate.trim();
  if (actualReturn && !returnDue) {
    throw new Error("Tanggal kembali rencana wajib diisi jika memakai tanggal kembali aktual.");
  }

  if (actualReturn && returnDue) {
    const expectedLate = lateDaysFromActualReturn(returnDue, actualReturn);
    assertClose("Hari terlambat", expectedLate, payload.lateDays);
  }

  const rentalCore = computeRentalSubtotal(payload.cart, payload.rentalDays);
  const firstDay = cartFirstDaySubtotal(payload.cart);
  assertClose("Total hari pertama", firstDay, payload.firstDaySubtotal);
  assertClose("Tambahan hari sewa", rentalCore - firstDay, payload.multiDayExtraAmount);
  assertClose("Total sewa", rentalCore, payload.baseTotalPrice);

  const lateExpected = calculateLateFee(
    payload.cart,
    payload.rentalDays,
    payload.lateDays,
  );
  assertClose("Denda", lateExpected, payload.lateFeeAmount);

  assertClose("Total akhir", rentalCore + lateExpected, payload.totalPrice);

  for (const item of payload.cart) {
    if (item.qty > item.stock) {
      throw new Error(`Stok ${item.name} tidak mencukupi.`);
    }
  }

  if (!isFirebaseConfigured) {
    return generateInvoiceCode();
  }

  const invoiceCode = generateInvoiceCode();
  const transactionRef = doc(transactionCollection);

  await runTransaction(db, async (firestoreTransaction) => {
    const productRefs = payload.cart.map((item) => doc(db, "products", item.productId));
    const productSnapshots = await Promise.all(
      productRefs.map((productRef) => firestoreTransaction.get(productRef)),
    );

    payload.cart.forEach((item, index) => {
      const productSnapshot = productSnapshots[index];

      if (!productSnapshot.exists()) {
        throw new Error(`Produk ${item.name} tidak ditemukan.`);
      }

      const currentStock = Number(productSnapshot.data().stock ?? 0);
      if (currentStock < item.qty) {
        throw new Error(`Stok ${item.name} tersisa ${currentStock}.`);
      }
    });

    payload.cart.forEach((item, index) => {
      firestoreTransaction.update(productRefs[index], {
        stock: increment(-item.qty),
        updatedAt: serverTimestamp(),
      });
    });

    firestoreTransaction.set(transactionRef, {
      invoiceCode,
      userId: payload.userId,
      userName: payload.userName,
      status: "rented",
      rentalDays: payload.rentalDays,
      pickupDate: pickup || null,
      returnDueDate: returnDue || null,
      actualReturnDate: payload.actualReturnDate.trim() || null,
      checkoutChecklist: payload.checkoutChecklist,
      firstDaySubtotal: payload.firstDaySubtotal,
      multiDayExtraAmount: payload.multiDayExtraAmount,
      renterIdType: payload.renterIdType || null,
      renterIdNumber: payload.renterIdNumber.trim() || null,
      baseTotalPrice: payload.baseTotalPrice,
      lateDays: payload.lateDays,
      lateFeeAmount: payload.lateFeeAmount,
      totalPrice: payload.totalPrice,
      paidAmount: payload.paidAmount,
      changeAmount: payload.paidAmount - payload.totalPrice,
      paymentMethod: payload.paymentMethod,
      items: payload.cart.map((item) => ({
        productId: item.productId,
        name: item.name,
        specification: item.specification ?? "",
        notes: item.notes ?? "",
        price: item.price,
        qty: item.qty,
        subtotal: Math.round(computeRentalLineTotal(item.price, item.qty, payload.rentalDays)),
        categoryName: item.categoryName,
      })),
      createdAt: serverTimestamp(),
    });
  });

  return invoiceCode;
};

export const updateTransaction = async (
  transactionId: string,
  payload: TransactionUpdateInput,
) => {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase belum dikonfigurasi. Isi .env.local untuk mengubah transaksi.");
  }

  const transactionRef = doc(db, "transactions", transactionId);
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

export const processReturnTransaction = async (
  transactionId: string,
  payload: ReturnTransactionInput,
) => {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase belum dikonfigurasi. Isi .env.local untuk memproses pengembalian.");
  }

  const transactionRef = doc(db, "transactions", transactionId);
  const transactionSnapshot = await getDoc(transactionRef);

  if (!transactionSnapshot.exists()) {
    throw new Error("Transaksi tidak ditemukan.");
  }

  const transaction = transactionSnapshot.data() as PosTransaction;
  if (!transaction.returnDueDate) {
    throw new Error("Transaksi ini tidak memiliki tanggal rencana kembali.");
  }

  const actualReturnDate = payload.actualReturnDate.trim();
  if (!actualReturnDate) {
    throw new Error("Tanggal kembali aktual wajib diisi.");
  }

  const additionalPaidAmount = Number(payload.additionalPaidAmount ?? 0);
  if (!Number.isFinite(additionalPaidAmount) || additionalPaidAmount < 0) {
    throw new Error("Nominal pembayaran tambahan tidak valid.");
  }
  if (!payload.returnChecklist) {
    throw new Error("Checklist pengembalian wajib dikirim.");
  }

  const rentalDays = Math.max(1, Math.floor(Number(transaction.rentalDays ?? 1)));
  const lateDays = lateDaysFromActualReturn(transaction.returnDueDate, actualReturnDate);
  const baseTotalPrice =
    Number(transaction.baseTotalPrice ?? 0) ||
    Math.max(0, Number(transaction.totalPrice ?? 0) - Number(transaction.lateFeeAmount ?? 0));

  const lateFeeAmount = calculateLateFee(
    transaction.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      specification: item.specification,
      notes: item.notes,
      price: item.price,
      qty: item.qty,
      stock: 0,
      subtotal: item.subtotal,
      categoryName: item.categoryName,
    })),
    rentalDays,
    lateDays,
  );

  const totalPrice = baseTotalPrice + lateFeeAmount;
  const paidAmount = Number(transaction.paidAmount ?? 0) + additionalPaidAmount;
  const changeAmount = Math.max(0, paidAmount - totalPrice);

  await runTransaction(db, async (firestoreTransaction) => {
    const productRefs = transaction.items.map((item) => doc(db, "products", item.productId));
    const productSnapshots = await Promise.all(
      productRefs.map((productRef) => firestoreTransaction.get(productRef)),
    );

    transaction.items.forEach((item, index) => {
      const snapshot = productSnapshots[index];
      if (!snapshot.exists()) {
        throw new Error(`Produk ${item.name} tidak ditemukan saat pengembalian.`);
      }
    });

    transaction.items.forEach((item, index) => {
      firestoreTransaction.update(productRefs[index], {
        stock: increment(item.qty),
        updatedAt: serverTimestamp(),
      });
    });

    firestoreTransaction.update(transactionRef, {
      status: "returned",
      actualReturnDate,
      returnedAt: serverTimestamp(),
      returnChecklist: payload.returnChecklist,
      lateDays,
      lateFeeAmount,
      totalPrice,
      paidAmount,
      changeAmount,
      updatedAt: serverTimestamp(),
    });
  });
};
