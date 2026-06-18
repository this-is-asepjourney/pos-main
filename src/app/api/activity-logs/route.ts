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
    const maxItems = Number(searchParams.get("limit") || 100);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM activity_logs WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?`,
      [session.tenantId, maxItems]
    );

    const logs = rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      action: r.action,
      description: r.description,
      metadata: r.metadata ? (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) : null,
      createdAt: r.created_at,
    }));

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Get activity logs error:", error);
    return NextResponse.json(
      { error: "Gagal memuat log aktivitas." },
      { status: 500 }
    );
  }
}
