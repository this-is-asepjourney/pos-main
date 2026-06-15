import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date().toISOString().slice(0, 10);

    // Transaksi hari ini
    const [todayRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count, COALESCE(SUM(total_price), 0) as revenue
       FROM transactions WHERE tenant_id = ? AND date_key = ? AND status = 'completed'`,
      [session.tenantId, today],
    );

    const todayRevenue = Number(todayRows[0]?.revenue ?? 0);
    const todayTransactions = Number(todayRows[0]?.count ?? 0);

    // Produk stok rendah
    const [lowStockRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM products WHERE tenant_id = ? AND total_stock <= 10 AND is_active = TRUE",
      [session.tenantId],
    );

    // Top produk (dari semua transaksi)
    const [topRows] = await pool.query<RowDataPacket[]>(
      `SELECT ti.name, SUM(ti.qty) as total_qty, SUM(ti.subtotal) as total_revenue
       FROM transaction_items ti
       JOIN transactions t ON t.id = ti.transaction_id
       WHERE t.tenant_id = ? AND t.status = 'completed'
       GROUP BY ti.product_id, ti.name
       ORDER BY total_qty DESC
       LIMIT 5`,
      [session.tenantId],
    );

    // Recent transactions
    const [recentRows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM transactions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 6`,
      [session.tenantId],
    );

    const recentIds = recentRows.map((r) => r.id);
    let itemsMap: Record<string, RowDataPacket[]> = {};

    if (recentIds.length > 0) {
      const [itemRows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM transaction_items WHERE transaction_id IN (${recentIds.map(() => "?").join(",")})`,
        recentIds,
      );
      for (const item of itemRows) {
        if (!itemsMap[item.transaction_id]) {
          itemsMap[item.transaction_id] = [];
        }
        itemsMap[item.transaction_id].push(item);
      }
    }

    return NextResponse.json({
      todayRevenue,
      todayTransactions,
      averageTransaction: todayTransactions > 0 ? todayRevenue / todayTransactions : 0,
      lowStockCount: Number(lowStockRows[0]?.count ?? 0),
      topProducts: topRows.map((r) => ({
        name: r.name,
        qty: Number(r.total_qty),
        revenue: Number(r.total_revenue),
      })),
      recentTransactions: recentRows.map((r) => ({
        id: r.id,
        invoiceCode: r.invoice_code,
        branchId: r.branch_id,
        userId: r.user_id,
        userName: r.user_name,
        totalPrice: Number(r.total_price),
        paidAmount: Number(r.paid_amount),
        changeAmount: Number(r.change_amount),
        paymentMethod: r.payment_method,
        status: r.status,
        items: (itemsMap[r.id] ?? []).map((item) => ({
          productId: item.product_id,
          name: item.name,
          price: Number(item.price),
          qty: item.qty,
          subtotal: Number(item.subtotal),
        })),
        dateKey: r.date_key,
        monthKey: r.month_key,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Gagal memuat dashboard." },
      { status: 500 },
    );
  }
}
