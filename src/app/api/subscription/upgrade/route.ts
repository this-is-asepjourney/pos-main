import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

/**
 * POST /api/subscription/upgrade
 * Body: { planId: string, paymentMethod: "manual" | "transfer" | "qris" }
 *
 * For this demo, payment is "manual confirmation" — in production hook
 * into Midtrans / Xendit after triggering payment gateway.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId || (session.role !== "owner" && !session.isSuperAdmin)) {
      return NextResponse.json({ error: "Hanya owner yang dapat mengubah subscription." }, { status: 403 });
    }

    const { planId, paymentMethod = "manual" } = await request.json();

    if (!planId) {
      return NextResponse.json({ error: "Plan ID wajib diisi." }, { status: 400 });
    }

    // Validate plan exists
    const [plans] = await pool.query<RowDataPacket[]>(
      "SELECT id, name, price_idr, billing_interval FROM plans WHERE id = ? AND is_active = 1 LIMIT 1",
      [planId]
    );

    if (!plans.length) {
      return NextResponse.json({ error: "Plan tidak ditemukan atau tidak aktif." }, { status: 404 });
    }

    const plan = plans[0];
    const now = new Date();
    const periodEnd = new Date(now);

    if (plan.billing_interval === "yearly") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Update subscription
      const newStatus = plan.price_idr === 0 ? "active" : "active"; // In prod: 'pending' until payment confirmed
      await conn.query(
        `INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end, payment_method, last_payment_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           plan_id = VALUES(plan_id),
           status = VALUES(status),
           current_period_start = VALUES(current_period_start),
           current_period_end = VALUES(current_period_end),
           payment_method = VALUES(payment_method),
           last_payment_at = VALUES(last_payment_at),
           trial_ends_at = NULL,
           cancelled_at = NULL`,
        [session.tenantId, planId, newStatus, now, periodEnd, paymentMethod, plan.price_idr > 0 ? now : null]
      );

      // Update tenant plan column
      await conn.query(
        "UPDATE tenants SET plan = ? WHERE id = ?",
        [planId.split("-")[0], session.tenantId] // e.g. "pro-yearly" → "pro"
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
      message: plan.price_idr === 0
        ? `Berhasil beralih ke plan ${plan.name}.`
        : `Plan ${plan.name} berhasil diaktifkan. Periode berakhir: ${periodEnd.toLocaleDateString("id-ID")}.`,
      planId,
      planName: plan.name,
      periodEnd: periodEnd.toISOString(),
    });
  } catch (error) {
    console.error("Subscription upgrade error:", error);
    return NextResponse.json({ error: "Gagal memperbarui subscription." }, { status: 500 });
  }
}
