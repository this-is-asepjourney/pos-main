import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import pool from "@/lib/db";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    await pool.query(
      `UPDATE discount_vouchers 
       SET code = ?, active = ?, start_at = ?, end_at = ?, usage_limit = ?, min_transaction_amount = ?, discount_type = ?, value = ?
       WHERE id = ? AND tenant_id = ?`,
      [
        body.code,
        body.active ?? true,
        body.startAt || null,
        body.endAt || null,
        body.usageLimit || null,
        body.minTransactionAmount || 0,
        body.discountType || 'PERCENTAGE',
        body.value || 0,
        id,
        session.tenantId
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update discount voucher error:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: "Kode voucher sudah ada." }, { status: 400 });
    }
    return NextResponse.json({ error: "Gagal memperbarui discount voucher." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    await pool.query("DELETE FROM discount_vouchers WHERE id = ? AND tenant_id = ?", [id, session.tenantId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete discount voucher error:", error);
    return NextResponse.json({ error: "Gagal menghapus discount voucher." }, { status: 500 });
  }
}
