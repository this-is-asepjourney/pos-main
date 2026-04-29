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
import type { CheckoutPayload, PosTransaction, TransactionUpdateInput } from "@/types/pos";

const transactionCollection = collection(db, "transactions");

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

export const checkout = async (payload: CheckoutPayload): Promise<string> => {
  if (!payload.cart.length) throw new Error("Keranjang masih kosong.");
  if (payload.paidAmount < payload.totalPrice) throw new Error("Nominal bayar kurang dari total belanja.");

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
      totalPrice: payload.totalPrice,
      paidAmount: payload.paidAmount,
      changeAmount: payload.paidAmount - payload.totalPrice,
      paymentMethod: payload.paymentMethod,
      items: payload.cart.map((item) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        qty: item.qty,
        subtotal: item.subtotal,
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
