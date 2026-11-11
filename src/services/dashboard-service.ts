import type { DashboardStats } from "@/types/pos";
import { getProducts } from "@/services/product-service";
import { getTransactions } from "@/services/transaction-service";
import { toDate } from "@/lib/format";

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const res = await fetch("/api/dashboard", { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("[Dashboard Service] API error, falling back to local computation:", err);
  }

  // Fallback computation
  const [transactions, products] = await Promise.all([getTransactions(100), getProducts()]);
  const today = new Date();
  const todayTransactions = transactions.filter((transaction) =>
    isSameDay(toDate(transaction.createdAt), today)
  );
  const todayRevenue = todayTransactions.reduce(
    (sum, transaction) => sum + transaction.totalPrice,
    0
  );

  const productSales = new Map<string, { name: string; qty: number; revenue: number }>();

  for (const transaction of transactions) {
    if (Array.isArray(transaction.items)) {
      for (const item of transaction.items) {
        const current = productSales.get(item.productId) ?? {
          name: item.name,
          qty: 0,
          revenue: 0,
        };
        current.qty += item.qty;
        current.revenue += item.subtotal;
        productSales.set(item.productId, current);
      }
    }
  }

  return {
    todayRevenue,
    todayTransactions: todayTransactions.length,
    averageTransaction: todayTransactions.length
      ? todayRevenue / todayTransactions.length
      : 0,
    lowStockCount: products.filter((product) => product.stock <= 10).length,
    topProducts: Array.from(productSales.values())
      .sort((left, right) => right.qty - left.qty)
      .slice(0, 5),
    recentTransactions: transactions.slice(0, 6),
  };
};
