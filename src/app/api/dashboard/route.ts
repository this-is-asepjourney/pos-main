import { NextResponse } from "next/server";
import { query, initDb, isPostgresConfigured } from "@/lib/db";
import { demoProducts, demoTransactions } from "@/lib/demo-data";
import { toDate } from "@/lib/format";
import type { DashboardStats, PosTransaction, Product } from "@/types/pos";

export async function GET() {
  if (!isPostgresConfigured()) {
    // Demo calculation
    const today = new Date().toISOString().slice(0, 10);
    const todayTrx = demoTransactions.filter((t) =>
      typeof t.createdAt === "string" && t.createdAt.startsWith(today)
    );
    const todayRevenue = todayTrx.reduce((sum, t) => sum + t.totalPrice, 0);

    const stats: DashboardStats = {
      todayRevenue,
      todayTransactions: todayTrx.length,
      averageTransaction: todayTrx.length ? todayRevenue / todayTrx.length : 0,
      lowStockCount: demoProducts.filter((p) => p.stock <= 10).length,
      topProducts: [
        { name: "Americano Double Shot", qty: 28, revenue: 560000 },
        { name: "Caramel Macchiato", qty: 22, revenue: 660000 },
      ],
      recentTransactions: demoTransactions.slice(0, 6),
    };
    return NextResponse.json(stats);
  }

  try {
    await initDb();

    // 1. Fetch recent transactions & products
    const [trxRes, prodRes] = await Promise.all([
      query(
        `SELECT 
          id, 
          invoice_code as "invoiceCode", 
          user_id as "userId", 
          user_name as "userName", 
          total_price::float as "totalPrice", 
          paid_amount::float as "paidAmount", 
          change_amount::float as "changeAmount", 
          payment_method as "paymentMethod", 
          items, 
          created_at as "createdAt"
         FROM transactions 
         ORDER BY created_at DESC 
         LIMIT 100`
      ),
      query(
        `SELECT id, name, stock::int as stock, price::float as price 
         FROM products`
      ),
    ]);

    const transactions = trxRes.rows as PosTransaction[];
    const products = prodRes.rows as Product[];

    // 2. Compute today stats in local time
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayTrx = transactions.filter((t) => {
      const dt = t.createdAt ? toDate(t.createdAt).toISOString().slice(0, 10) : "";
      return dt === todayStr;
    });

    const todayRevenue = todayTrx.reduce((sum, t) => sum + t.totalPrice, 0);
    const todayTransactions = todayTrx.length;
    const averageTransaction = todayTransactions ? todayRevenue / todayTransactions : 0;
    const lowStockCount = products.filter((p) => p.stock <= 10).length;

    // 3. Aggregate top products
    const productSales = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const trx of transactions) {
      if (Array.isArray(trx.items)) {
        for (const item of trx.items) {
          const curr = productSales.get(item.productId) ?? {
            name: item.name,
            qty: 0,
            revenue: 0,
          };
          curr.qty += item.qty || 0;
          curr.revenue += item.subtotal || 0;
          productSales.set(item.productId, curr);
        }
      }
    }

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const stats: DashboardStats = {
      todayRevenue,
      todayTransactions,
      averageTransaction,
      lowStockCount,
      topProducts,
      recentTransactions: transactions.slice(0, 6),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("[Dashboard GET] Error:", error);
    return NextResponse.json({
      todayRevenue: 0,
      todayTransactions: 0,
      averageTransaction: 0,
      lowStockCount: 0,
      topProducts: [],
      recentTransactions: [],
    });
  }
}
