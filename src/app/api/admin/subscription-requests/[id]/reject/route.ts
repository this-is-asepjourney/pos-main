import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSuperAdminSession } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

/**
 * POST /api/admin/subscription-requests/[id]/reject
 * Body: { adminNote?: string }
 *
 * Rejects a pending subscription request → reverts subscription status.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { adminNote } = body;

    // Get the request
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM subscription_requests WHERE id = ? AND status = 'pending' LIMIT 1",
      [id]
    );

    if (!rows.length) {
      return NextResponse.json(
        { error: "Request tidak ditemukan atau sudah diproses." },
        { status: 404 }
      );
    }

    const req = rows[0];
    const now = new Date();

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Update subscription_request to rejected
      await conn.query(
        `UPDATE subscription_requests 
         SET status = 'rejected', admin_note = ?, approved_by = ?, rejected_at = ?
         WHERE id = ?`,
        [adminNote || null, session.uid, now, id]
      );

      // 2. Revert subscription status back from pending_approval
      // Check if there's a current subscription
      const [subRows] = await conn.query<RowDataPacket[]>(
        "SELECT plan_id, status FROM subscriptions WHERE tenant_id = ? LIMIT 1",
        [req.tenant_id]
      );

      if (subRows.length > 0 && subRows[0].status === "pending_approval") {
        // Revert to previous status based on current plan
        const previousPlanId = req.current_plan_id || "free";
        const newStatus = previousPlanId === "free" ? "trial" : "active";
        await conn.query(
          "UPDATE subscriptions SET status = ? WHERE tenant_id = ?",
          [newStatus, req.tenant_id]
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return NextResponse.json({
      success: true,
      message: `Subscription request ditolak untuk ${req.tenant_name}.`,
    });
  } catch (error) {
    console.error("Reject subscription request error:", error);
    return NextResponse.json({ error: "Gagal menolak request." }, { status: 500 });
  }
}
