import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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

    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT id, email, name, is_superadmin as isSuperadmin, default_tenant_id as defaultTenantId,
              created_at as createdAt, updated_at as updatedAt
       FROM users WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!users.length) {
      return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
    }

    const user = { ...users[0], isSuperadmin: Boolean(users[0].isSuperadmin) };

    // Tenants where this user is a member
    const [memberships] = await pool.query<RowDataPacket[]>(
      `SELECT 
         m.id as memberId, m.role, m.status as memberStatus, m.joined_at as joinedAt,
         t.id as tenantId, t.name as tenantName, t.slug, t.status as tenantStatus, t.plan,
         s.status as subStatus, s.plan_id as planId,
         s.trial_ends_at as trialEndsAt, s.current_period_start as periodStart,
         s.current_period_end as periodEnd, s.last_payment_at as lastPaymentAt,
         (SELECT COUNT(*) FROM members mm WHERE mm.tenant_id = t.id) as memberCount,
         (SELECT COUNT(*) FROM products p WHERE p.tenant_id = t.id) as productCount,
         (SELECT COALESCE(SUM(total_price),0) FROM transactions tx WHERE tx.tenant_id = t.id AND tx.status='completed') as totalRevenue
       FROM members m
       JOIN tenants t ON t.id = m.tenant_id
       LEFT JOIN subscriptions s ON s.tenant_id = t.id
       WHERE m.user_id = ?
       ORDER BY m.joined_at DESC`,
      [id]
    );

    return NextResponse.json({ user, memberships });
  } catch (error) {
    console.error("Admin user detail error:", error);
    return NextResponse.json({ error: "Gagal mengambil detail user." }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const { name, email, isSuperadmin, password } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Nama dan email wajib diisi." },
        { status: 400 },
      );
    }

    if (password && password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter." },
        { status: 400 },
      );
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 12);
      await pool.query(
        "UPDATE users SET name = ?, email = ?, is_superadmin = ?, password_hash = ? WHERE id = ?",
        [name, email, isSuperadmin ? 1 : 0, passwordHash, id]
      );
    } else {
      await pool.query(
        "UPDATE users SET name = ?, email = ?, is_superadmin = ? WHERE id = ?",
        [name, email, isSuperadmin ? 1 : 0, id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update user admin error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui user." },
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

    if (id === session.uid) {
      return NextResponse.json(
        { error: "Anda tidak bisa menghapus diri sendiri." },
        { status: 400 },
      );
    }

    await pool.query("DELETE FROM users WHERE id = ?", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user admin error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus user." },
      { status: 500 },
    );
  }
}
