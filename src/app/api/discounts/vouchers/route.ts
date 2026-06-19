import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import pool from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM discount_vouchers WHERE tenant_id = ? ORDER BY created_at DESC",
      [session.tenantId]
    );

    const vouchers = rows.map((r) => ({
      id: r.id,
      code: r.code,
      active: Boolean(r.active),
      startAt: r.start_at,
      endAt: r.end_at,
      usageLimit: r.usage_limit,
      usedCount: Number(r.used_count),
      minTransactionAmount: Number(r.min_transaction_amount),
      discountType: r.discount_type,
      value: Number(r.value),
    }));

    return NextResponse.json(vouchers);
  } catch (error) {
    console.error("Get discount vouchers error:", error);
    return NextResponse.json({ error: "Gagal memuat discount vouchers." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const id = uuidv4();

    await pool.query(
      `INSERT INTO discount_vouchers 
       (id, tenant_id, code, active, start_at, end_at, usage_limit, min_transaction_amount, discount_type, value)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        session.tenantId,
        body.code,
        body.active ?? true,
        body.startAt || null,
        body.endAt || null,
        body.usageLimit || null,
        body.minTransactionAmount || 0,
        body.discountType || 'PERCENTAGE',
        body.value || 0,
      ]
    );

    return NextResponse.json({ id }, { status: 201 });
  } catch (error: any) {
    console.error("Create discount voucher error:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: "Kode voucher sudah ada." }, { status: 400 });
    }
    return NextResponse.json({ error: "Gagal membuat discount voucher." }, { status: 500 });
  }
}
