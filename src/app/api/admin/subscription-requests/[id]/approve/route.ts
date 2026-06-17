import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSuperAdminSession } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

/**
 * POST /api/admin/subscription-requests/[id]/approve
 * Body: { paymentMethod?: string, adminNote?: string }
 *
 * Approves a pending subscription request → activates the plan for the tenant.
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
    const { paymentMethod, adminNote } = body;

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
    const periodEnd = new Date(now);

    // Get plan billing interval
    const [planRows] = await pool.query<RowDataPacket[]>(
      "SELECT billing_interval FROM plans WHERE id = ? LIMIT 1",
      [req.requested_plan_id]
    );
    const billingInterval = planRows[0]?.billing_interval ?? "monthly";

    if (billingInterval === "yearly") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const finalPaymentMethod = paymentMethod || req.payment_method || "manual";

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Update subscription_request to approved
      await conn.query(
        `UPDATE subscription_requests 
         SET status = 'approved', admin_note = ?, approved_by = ?, approved_at = ?, 
             payment_method = ?
         WHERE id = ?`,
        [adminNote || null, session.uid, now, finalPaymentMethod, id]
      );

      // 2. Update subscription → active with new plan
      await conn.query(
        `INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end, payment_method, last_payment_at)
         VALUES (?, ?, 'active', ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           plan_id = VALUES(plan_id),
           status = 'active',
           current_period_start = VALUES(current_period_start),
           current_period_end = VALUES(current_period_end),
           payment_method = VALUES(payment_method),
           last_payment_at = VALUES(last_payment_at),
           trial_ends_at = NULL,
           cancelled_at = NULL`,
        [req.tenant_id, req.requested_plan_id, now, periodEnd, finalPaymentMethod, now]
      );

      // 3. Update tenant plan column
      const basePlan = req.requested_plan_id.split("-")[0]; // e.g. "pro-yearly" → "pro"
      await conn.query(
        "UPDATE tenants SET plan = ?, status = 'active' WHERE id = ?",
        [basePlan, req.tenant_id]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return NextResponse.json({
      success: true,
      message: `Subscription request berhasil disetujui. Plan ${req.requested_plan_name} aktif untuk ${req.tenant_name}.`,
    });
  } catch (error) {
    console.error("Approve subscription request error:", error);
    return NextResponse.json({ error: "Gagal menyetujui request." }, { status: 500 });
  }
}
