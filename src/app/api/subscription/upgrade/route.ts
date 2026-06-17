import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";
import { v4 as uuidv4 } from "uuid";

/**
 * POST /api/subscription/upgrade
 * Body: { planId: string, paymentMethod: "transfer" | "qris" | "manual", paymentProofNote?: string }
 *
 * For FREE plans: instantly downgrade/switch.
 * For paid plans: create a subscription_request with status 'pending' — superadmin must approve.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId || (session.role !== "owner" && !session.isSuperAdmin)) {
      return NextResponse.json({ error: "Hanya owner yang dapat mengubah subscription." }, { status: 403 });
    }

    const { planId, paymentMethod = "manual", paymentProofNote = "" } = await request.json();

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

    // Get current plan info
    const [currentSub] = await pool.query<RowDataPacket[]>(
      "SELECT plan_id FROM subscriptions WHERE tenant_id = ? LIMIT 1",
      [session.tenantId]
    );
    const currentPlanId = currentSub[0]?.plan_id ?? "free";

    // Get tenant name
    const [tenantRows] = await pool.query<RowDataPacket[]>(
      "SELECT name FROM tenants WHERE id = ? LIMIT 1",
      [session.tenantId]
    );
    const tenantName = tenantRows[0]?.name ?? "Unknown";

    // Check if there's already a pending request for this tenant
    const [existingReqs] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM subscription_requests WHERE tenant_id = ? AND status = 'pending' LIMIT 1",
      [session.tenantId]
    );
    if (existingReqs.length > 0) {
      return NextResponse.json(
        { error: "Anda sudah memiliki permintaan upgrade yang sedang menunggu persetujuan. Harap tunggu konfirmasi admin." },
        { status: 409 }
      );
    }

    // FREE plan: instant switch (no approval needed)
    if (plan.price_idr === 0) {
      const now = new Date();
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        await conn.query(
          `INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end, payment_method)
           VALUES (?, ?, 'active', ?, NULL, 'free')
           ON DUPLICATE KEY UPDATE
             plan_id = VALUES(plan_id), status = 'active',
             current_period_start = VALUES(current_period_start),
             current_period_end = NULL, payment_method = 'free',
             trial_ends_at = NULL, cancelled_at = NULL`,
          [session.tenantId, planId, now]
        );

        await conn.query("UPDATE tenants SET plan = ? WHERE id = ?", [planId, session.tenantId]);
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }

      return NextResponse.json({
        success: true,
        requiresApproval: false,
        message: `Berhasil beralih ke plan ${plan.name}.`,
        planId,
        planName: plan.name,
      });
    }

    // PAID plan: create a pending request — requires superadmin approval
    const requestId = uuidv4();

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Insert subscription request
      await conn.query(
        `INSERT INTO subscription_requests (id, tenant_id, tenant_name, requested_plan_id, requested_plan_name, current_plan_id, payment_method, payment_proof_note, amount_idr, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [requestId, session.tenantId, tenantName, planId, plan.name, currentPlanId, paymentMethod, paymentProofNote || null, plan.price_idr]
      );

      // Update subscription status to pending_approval
      await conn.query(
        `INSERT INTO subscriptions (tenant_id, plan_id, status)
         VALUES (?, ?, 'pending_approval')
         ON DUPLICATE KEY UPDATE status = 'pending_approval'`,
        [session.tenantId, currentPlanId]
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
      requiresApproval: true,
      message: `Permintaan upgrade ke ${plan.name} telah dikirim. Menunggu konfirmasi admin.`,
      requestId,
      planId,
      planName: plan.name,
    });
  } catch (error) {
    console.error("Subscription upgrade error:", error);
    return NextResponse.json({ error: "Gagal memproses permintaan subscription." }, { status: 500 });
  }
}
