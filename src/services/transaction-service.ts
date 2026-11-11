import { demoTransactions } from "@/lib/demo-data";
import type { CheckoutPayload, PosTransaction, TransactionUpdateInput } from "@/types/pos";

export type Unsubscribe = () => void;

export const getTransactions = async (maxItems = 100): Promise<PosTransaction[]> => {
  try {
    const res = await fetch(`/api/transactions?limit=${maxItems}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Gagal mengambil data transaksi");
    return await res.json();
  } catch (err) {
    console.warn("[Transaction Service] Error fetching transactions, using fallback:", err);
    return demoTransactions.slice(0, maxItems);
  }
};

export const subscribeTransactions = (
  callback: (transactions: PosTransaction[]) => void,
  maxItems = 50
): Unsubscribe => {
  let active = true;

  const load = async () => {
    try {
      const data = await getTransactions(maxItems);
      if (active) callback(data);
    } catch {
      if (active) callback([]);
    }
  };

  load();
  const intervalId = setInterval(load, 5000);

  return () => {
    active = false;
    clearInterval(intervalId);
  };
};

export const checkout = async (payload: CheckoutPayload): Promise<string> => {
  if (!payload.cart.length) throw new Error("Keranjang masih kosong.");
  if (payload.paidAmount < payload.totalPrice) {
    throw new Error("Nominal bayar kurang dari total belanja.");
  }

  for (const item of payload.cart) {
    if (item.qty > item.stock) {
      throw new Error(`Stok ${item.name} tidak mencukupi.`);
    }
  }

  const res = await fetch("/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || "Gagal memproses checkout transaksi.");
  }

  const data = await res.json();
  return data.invoiceCode;
};

export const updateTransaction = async (
  transactionId: string,
  payload: TransactionUpdateInput
) => {
  const res = await fetch(`/api/transactions/${transactionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || "Gagal mengupdate transaksi.");
  }

  return await res.json();
};
