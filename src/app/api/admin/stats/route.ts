import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSuperAdminSession } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [tenantRows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) as count FROM tenants");
    const [userRows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) as count FROM users");
    const [revenueRows] = await pool.query<RowDataPacket[]>(
      "SELECT COALESCE(SUM(total_price), 0) as total FROM transactions WHERE status = 'completed'",
    );
    const [subRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'",
    );
    const [pendingRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM subscription_requests WHERE status = 'pending'",
    );

    return NextResponse.json({
      totalTenants: Number(tenantRows[0]?.count ?? 0),
      totalUsers: Number(userRows[0]?.count ?? 0),
      totalRevenue: Number(revenueRows[0]?.total ?? 0),
      activeSubscriptions: Number(subRows[0]?.count ?? 0),
      pendingRequests: Number(pendingRows[0]?.count ?? 0),
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data statistik admin." },
      { status: 500 },
    );
  }
}

