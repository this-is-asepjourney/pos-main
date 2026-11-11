import { NextResponse } from "next/server";
import { query, initDb, isPostgresConfigured } from "@/lib/db";
import type { TransactionUpdateInput } from "@/types/pos";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const payload: TransactionUpdateInput = await request.json();
    const { paidAmount, paymentMethod } = payload;

    if (!isPostgresConfigured()) {
      return NextResponse.json({ success: true, id, ...payload });
    }

    await initDb();
    const now = new Date().toISOString();

    // Fetch existing transaction to recalculate change
    const existing = await query(
      "SELECT total_price::float as total_price FROM transactions WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });
    }

    const totalPrice = existing.rows[0].total_price;
    const changeAmount = Math.max(0, paidAmount - totalPrice);

    await query(
      `UPDATE transactions 
       SET paid_amount = $1, 
           change_amount = $2, 
           payment_method = $3, 
           updated_at = $4 
       WHERE id = $5`,
      [paidAmount, changeAmount, paymentMethod, now, id]
    );

    return NextResponse.json({
      success: true,
      id,
      paidAmount,
      changeAmount,
      paymentMethod,
    });
  } catch (error) {
    console.error("[Transactions PUT] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mengupdate transaksi." },
      { status: 500 }
    );
  }
}

