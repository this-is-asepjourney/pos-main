import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, userName, role, branchId } = (await request.json()) as {
      userId: string;
      userName: string;
      role: string;
      branchId?: string;
    };

    // Cek apakah sudah ada shift aktif
    const [active] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM attendance WHERE tenant_id = ? AND user_id = ? AND status = 'active' LIMIT 1",
      [session.tenantId, userId],
    );

    if (active.length > 0) {
      return NextResponse.json(
        { error: "Shift kamu masih aktif. Akhiri shift sebelum mulai lagi." },
        { status: 400 },
      );
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO attendance (id, tenant_id, user_id, user_name, role, branch_id, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [id, session.tenantId, userId, userName, role, branchId ?? "main"],
    );

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Start shift error:", error);
    return NextResponse.json(
      { error: "Gagal memulai shift." },
      { status: 500 },
    );
  }
}
