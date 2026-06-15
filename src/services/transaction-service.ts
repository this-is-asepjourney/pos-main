import type {
  CheckoutPayload,
  PosTransaction,
  TransactionUpdateInput,
} from "@/types/pos";

export const getTransactions = async (
  maxItems = 100,
  branchId?: string,
  cashierId?: string,
): Promise<PosTransaction[]> => {
  const params = new URLSearchParams();
  if (maxItems) params.append("limit", maxItems.toString());
  if (branchId && branchId !== "*") params.append("branchId", branchId);
  if (cashierId) params.append("cashierId", cashierId);

  const response = await fetch(`/api/transactions?${params.toString()}`);
  if (!response.ok) throw new Error("Gagal memuat transaksi.");
  return response.json();
};

export const checkout = async (
  payload: CheckoutPayload,
): Promise<string> => {
  const response = await fetch("/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Checkout gagal diproses.");
  }
  
  const data = await response.json();
  return data.invoiceCode;
};

export const updateTransaction = async (
  transactionId: string,
  payload: TransactionUpdateInput,
) => {
  const response = await fetch(`/api/transactions/${transactionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Gagal mengubah transaksi.");
  }
  
  return response.json();
};
