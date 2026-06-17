import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSuperAdminSession } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const [tenants] = await pool.query<RowDataPacket[]>(
      `SELECT 
         t.id, t.name, t.slug, t.owner_uid as ownerUid, t.status, t.plan,
         t.branch_count as branchCount, t.settings, t.created_at as createdAt,
         u.name as ownerName, u.email as ownerEmail,
         s.status as subStatus, s.plan_id as planId,
         s.trial_ends_at as trialEndsAt, s.current_period_start as periodStart,
         s.current_period_end as periodEnd, s.last_payment_at as lastPaymentAt,
         (SELECT COUNT(*) FROM members m WHERE m.tenant_id = t.id) as memberCount,
         (SELECT COUNT(*) FROM products p WHERE p.tenant_id = t.id) as productCount,
         (SELECT COALESCE(SUM(total_price),0) FROM transactions tx WHERE tx.tenant_id = t.id AND tx.status='completed') as totalRevenue,
         (SELECT COUNT(*) FROM transactions tx WHERE tx.tenant_id = t.id AND tx.status='completed') as totalTransactions
       FROM tenants t
       LEFT JOIN users u ON u.id = t.owner_uid
       LEFT JOIN subscriptions s ON s.tenant_id = t.id
       WHERE t.id = ?
       LIMIT 1`,
      [id]
    );

    if (!tenants.length) {
      return NextResponse.json({ error: "Tenant tidak ditemukan." }, { status: 404 });
    }

    const tenant = tenants[0];

    // Members
    const [members] = await pool.query<RowDataPacket[]>(
      `SELECT m.id, m.role, m.status, m.joined_at as joinedAt,
              u.id as userId, u.name, u.email
       FROM members m
       JOIN users u ON u.id = m.user_id
       WHERE m.tenant_id = ?
       ORDER BY m.joined_at ASC`,
      [id]
    );

    // Branches
    const [branches] = await pool.query<RowDataPacket[]>(
      "SELECT id, name, address, phone, is_active as isActive, created_at as createdAt FROM branches WHERE tenant_id = ? ORDER BY created_at ASC",
      [id]
    );

    // Recent transactions
    const [recentTx] = await pool.query<RowDataPacket[]>(
      `SELECT id, invoice_code as invoiceCode, total_price as totalPrice, payment_method as paymentMethod,
              status, created_at as createdAt
       FROM transactions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 10`,
      [id]
    );

    return NextResponse.json({ tenant, members, branches, recentTransactions: recentTx });
  } catch (error) {
    console.error("Admin tenant detail error:", error);
    return NextResponse.json({ error: "Gagal mengambil detail tenant." }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const { name, status, plan } = await request.json();

    if (!name || !status || !plan) {
      return NextResponse.json(
        { error: "Nama, status, dan plan wajib diisi." },
        { status: 400 },
      );
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        "UPDATE tenants SET name = ?, status = ?, plan = ? WHERE id = ?",
        [name, status, plan, id]
      );

      await conn.query(
        "UPDATE subscriptions SET plan_id = ?, status = ? WHERE tenant_id = ?",
        [plan, status, id]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update tenant admin error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui tenant." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    await pool.query("DELETE FROM tenants WHERE id = ?", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete tenant admin error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus tenant." },
      { status: 500 },
    );
  }
}
