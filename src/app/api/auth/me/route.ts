import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, signToken, sessionCookieOptions } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Always read fresh data from DB (picks up is_superadmin, name, email changes)
    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT id, email, name, default_tenant_id, is_superadmin FROM users WHERE id = ? LIMIT 1",
      [session.uid],
    );

    if (!users[0]) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const user = users[0];

    const [members] = await pool.query<RowDataPacket[]>(
      `SELECT m.tenant_id, m.role, m.branch_ids, m.status, t.name as tenant_name
       FROM members m
       JOIN tenants t ON t.id = m.tenant_id
       WHERE m.user_id = ? AND m.status = 'active'
       ORDER BY m.joined_at ASC`,
      [user.id],
    );

    const memberships = members.map((m) => ({
      tenantId: m.tenant_id,
      tenantName: m.tenant_name,
      role: m.role,
      branchIds:
        typeof m.branch_ids === "string"
          ? JSON.parse(m.branch_ids)
          : m.branch_ids ?? [],
    }));

    // Tenant aktif
    const activeMembership =
      memberships.find(
        (m) => m.tenantId === (session.tenantId ?? user.default_tenant_id),
      ) ??
      memberships[0] ??
      null;

    const freshIsSuperAdmin = Boolean(user.is_superadmin);

    const response = NextResponse.json({
      user: {
        uid: user.id,
        email: user.email,
        name: user.name,
        tenantId: activeMembership?.tenantId ?? null,
        role: activeMembership?.role ?? "cashier",
        branchIds: activeMembership?.branchIds ?? [],
        memberships,
        needsOnboarding: memberships.length === 0,
        isSuperAdmin: freshIsSuperAdmin,
      },
    });

    return response;
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
