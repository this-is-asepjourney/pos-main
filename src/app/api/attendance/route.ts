import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");
    const maxItems = Number(searchParams.get("limit") || 100);

    let sql = "SELECT * FROM attendance WHERE tenant_id = ?";
    const params: unknown[] = [session.tenantId];

    if (statusFilter) {
      sql += " AND status = ?";
      params.push(statusFilter);
    }

    sql += " ORDER BY started_at DESC LIMIT ?";
    params.push(maxItems);

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);

    const shifts = rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      role: r.role,
      branchId: r.branch_id,
      status: r.status,
      openingCash: r.opening_cash ? Number(r.opening_cash) : undefined,
      closingCash: r.closing_cash ? Number(r.closing_cash) : undefined,
      startedAt: r.started_at,
      endedAt: r.ended_at,
    }));

    return NextResponse.json(shifts);
  } catch (error) {
    console.error("Get attendance error:", error);
    return NextResponse.json(
      { error: "Gagal memuat absensi." },
      { status: 500 },
    );
  }
}
