import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import pool from "@/lib/db";
import { discountService } from "@/lib/services/discount-service";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const conditionValueStr = body.conditionValue ? JSON.stringify(body.conditionValue) : null;

    await pool.query(
      `UPDATE discount_rules 
       SET name = ?, active = ?, priority = ?, start_at = ?, end_at = ?, condition_type = ?, condition_value = ?, discount_type = ?, value = ?, allow_stack = ?
       WHERE id = ? AND tenant_id = ?`,
      [
        body.name,
        body.active ?? true,
        body.priority || 0,
        body.startAt || null,
        body.endAt || null,
        body.conditionType || 'NONE',
        conditionValueStr,
        body.discountType || 'PERCENTAGE',
        body.value || 0,
        body.allowStack ?? true,
        id,
        session.tenantId
      ]
    );

    await discountService.invalidateRulesCache(session.tenantId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update discount rule error:", error);
    return NextResponse.json({ error: "Gagal memperbarui discount rule." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    await pool.query("DELETE FROM discount_rules WHERE id = ? AND tenant_id = ?", [id, session.tenantId]);
    await discountService.invalidateRulesCache(session.tenantId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete discount rule error:", error);
    return NextResponse.json({ error: "Gagal menghapus discount rule." }, { status: 500 });
  }
}
