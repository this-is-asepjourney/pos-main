import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession, signToken, sessionCookieOptions } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenantId } = (await request.json()) as { tenantId: string };

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID wajib diisi." },
        { status: 400 },
      );
    }

    // Cek membership
    const [members] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM members WHERE tenant_id = ? AND user_id = ? AND status = 'active' LIMIT 1",
      [tenantId, session.uid],
    );

    if (!members[0]) {
      return NextResponse.json(
        { error: "Anda bukan anggota tenant ini." },
        { status: 403 },
      );
    }

    const member = members[0];

    // Update default tenant
    await pool.query(
      "UPDATE users SET default_tenant_id = ? WHERE id = ?",
      [tenantId, session.uid],
    );

    // Issue token baru
    const branchIds =
      typeof member.branch_ids === "string"
        ? JSON.parse(member.branch_ids)
        : member.branch_ids ?? [];

    const token = await signToken({
      uid: session.uid,
      email: session.email,
      name: session.name,
      tenantId,
      role: member.role,
      branchIds,
      isSuperAdmin: Boolean(session.isSuperAdmin),
    });

    const response = NextResponse.json({
      tenantId,
      role: member.role,
      branchIds,
    });

    response.cookies.set(sessionCookieOptions(token));
    return response;
  } catch (error) {
    console.error("Switch tenant error:", error);
    return NextResponse.json(
      { error: "Gagal berganti toko." },
      { status: 500 },
    );
  }
}
