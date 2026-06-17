import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, signToken, sessionCookieOptions } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

/**
 * POST /api/auth/refresh
 * Re-mints the JWT from the current DB state (picks up is_superadmin changes, etc.)
 * Requires an existing valid session to call.
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT id, email, name, is_superadmin, default_tenant_id FROM users WHERE id = ? LIMIT 1",
      [session.uid]
    );

    if (!users.length) {
      return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
    }

    const user = users[0];

    const [members] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM members WHERE user_id = ? AND status = 'active' ORDER BY joined_at ASC",
      [user.id]
    );

    const activeMember =
      members.find((m) => m.tenant_id === (session.tenantId ?? user.default_tenant_id)) ??
      members[0] ??
      null;

    const token = await signToken({
      uid: user.id,
      email: user.email,
      name: user.name,
      tenantId: activeMember?.tenant_id ?? null,
      role: activeMember?.role ?? "cashier",
      branchIds: activeMember?.branch_ids
        ? typeof activeMember.branch_ids === "string"
          ? JSON.parse(activeMember.branch_ids)
          : activeMember.branch_ids
        : [],
      isSuperAdmin: Boolean(user.is_superadmin),
    });

    const response = NextResponse.json({ success: true, isSuperAdmin: Boolean(user.is_superadmin) });
    response.cookies.set(sessionCookieOptions(token));
    return response;
  } catch (error) {
    console.error("Session refresh error:", error);
    return NextResponse.json({ error: "Gagal refresh sesi." }, { status: 500 });
  }
}
