import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT m.*, u.email as user_email FROM members m
       LEFT JOIN users u ON u.id = m.user_id
       WHERE m.tenant_id = ?
       ORDER BY m.joined_at ASC`,
      [session.tenantId],
    );

    const members = rows.map((r) => ({
      id: r.id,
      uid: r.user_id,
      email: r.email,
      name: r.name,
      role: r.role,
      branchIds:
        typeof r.branch_ids === "string"
          ? JSON.parse(r.branch_ids)
          : r.branch_ids ?? [],
      status: r.status,
      joinedAt: r.joined_at,
    }));

    return NextResponse.json(members);
  } catch (error) {
    console.error("Get members error:", error);
    return NextResponse.json(
      { error: "Gagal memuat anggota." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      userId: string;
      email: string;
      name: string;
      role: string;
      branchIds: string[];
    };

    // Cek user ada
    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE id = ?",
      [body.userId],
    );

    if (!users[0]) {
      return NextResponse.json(
        { error: "User tidak ditemukan." },
        { status: 404 },
      );
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO members (id, tenant_id, user_id, email, name, role, branch_ids, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
       ON DUPLICATE KEY UPDATE role = VALUES(role), branch_ids = VALUES(branch_ids), status = 'active'`,
      [id, session.tenantId, body.userId, body.email, body.name, body.role, JSON.stringify(body.branchIds)],
    );

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Invite member error:", error);
    return NextResponse.json(
      { error: "Gagal mengundang anggota." },
      { status: 500 },
    );
  }
}
