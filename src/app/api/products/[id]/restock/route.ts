import { NextResponse, type NextRequest } from "next/server";
import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { qty, branchId } = (await request.json()) as {
      qty: number;
      branchId?: string;
    };

    if (!Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json(
        { error: "Jumlah restock harus lebih dari 0." },
        { status: 400 },
      );
    }

    const delta = Math.floor(qty);
    const branch = branchId ?? "main";

    // Ambil stock_by_branch saat ini
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT stock_by_branch, total_stock FROM products WHERE id = ? AND tenant_id = ?",
      [id, session.tenantId],
    );

    if (!rows[0]) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan." },
        { status: 404 },
      );
    }

    const currentStockByBranch =
      typeof rows[0].stock_by_branch === "string"
        ? JSON.parse(rows[0].stock_by_branch)
        : rows[0].stock_by_branch ?? {};

    currentStockByBranch[branch] = (currentStockByBranch[branch] ?? 0) + delta;
    const newTotalStock = (rows[0].total_stock ?? 0) + delta;

    await pool.query(
      "UPDATE products SET stock_by_branch = ?, total_stock = ? WHERE id = ? AND tenant_id = ?",
      [JSON.stringify(currentStockByBranch), newTotalStock, id, session.tenantId],
    );

    return NextResponse.json({ success: true, totalStock: newTotalStock });
  } catch (error) {
    console.error("Restock error:", error);
    return NextResponse.json(
      { error: "Gagal restock produk." },
      { status: 500 },
    );
  }
}
