import { NextResponse, type NextRequest } from "next/server";
import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { paidAmount, paymentMethod } = (await request.json()) as {
      paidAmount: number;
      paymentMethod: string;
    };

    // Ambil transaksi
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT total_price FROM transactions WHERE id = ? AND tenant_id = ?",
      [id, session.tenantId],
    );

    if (!rows[0]) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan." },
        { status: 404 },
      );
    }

    const totalPrice = Number(rows[0].total_price);
    if (paidAmount < 0) {
      return NextResponse.json(
        { error: "Nominal dibayar tidak boleh kurang dari 0." },
        { status: 400 },
      );
    }

    if (paidAmount < totalPrice) {
      return NextResponse.json(
        { error: "Nominal dibayar kurang dari total transaksi." },
        { status: 400 },
      );
    }

    await pool.query(
      `UPDATE transactions SET paid_amount = ?, change_amount = ?, payment_method = ?
       WHERE id = ? AND tenant_id = ?`,
      [paidAmount, paidAmount - totalPrice, paymentMethod, id, session.tenantId],
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update transaction error:", error);
    return NextResponse.json(
      { error: "Gagal mengubah transaksi." },
      { status: 500 },
    );
  }
}
