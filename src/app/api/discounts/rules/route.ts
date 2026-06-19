import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import pool from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import type { RowDataPacket } from "mysql2";
import { discountService } from "@/lib/services/discount-service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM discount_rules WHERE tenant_id = ? ORDER BY priority DESC, created_at DESC",
      [session.tenantId]
    );

    const rules = rows.map((r) => ({
      id: r.id,
      name: r.name,
      active: Boolean(r.active),
      priority: Number(r.priority),
      startAt: r.start_at,
      endAt: r.end_at,
      conditionType: r.condition_type,
      conditionValue: r.condition_value ? JSON.parse(r.condition_value) : null,
      discountType: r.discount_type,
      value: Number(r.value),
      allowStack: Boolean(r.allow_stack),
    }));

    return NextResponse.json(rules);
  } catch (error) {
    console.error("Get discount rules error:", error);
    return NextResponse.json({ error: "Gagal memuat discount rules." }, { status: 500 });
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
    const conditionValueStr = body.conditionValue ? JSON.stringify(body.conditionValue) : null;

    await pool.query(
      `INSERT INTO discount_rules 
       (id, tenant_id, name, active, priority, start_at, end_at, condition_type, condition_value, discount_type, value, allow_stack)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        session.tenantId,
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
      ]
    );

    await discountService.invalidateRulesCache(session.tenantId);

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Create discount rule error:", error);
    return NextResponse.json({ error: "Gagal membuat discount rule." }, { status: 500 });
  }
}
