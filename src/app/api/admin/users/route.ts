import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import pool from "@/lib/db";
import { getSuperAdminSession } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         id, email, name, is_superadmin as isSuperadmin, created_at as createdAt,
         (SELECT COUNT(*) FROM members m WHERE m.user_id = users.id) as tenantCount
       FROM users
       ORDER BY created_at DESC`
    );

    return NextResponse.json(rows.map(r => ({ ...r, isSuperadmin: Boolean(r.isSuperadmin) })));
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data user." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, name, password, isSuperadmin } = await request.json();

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "Email, nama, dan password wajib diisi." },
        { status: 400 },
      );
    }

    // Cek email sudah terdaftar
    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Email sudah terdaftar." },
        { status: 409 },
      );
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO users (id, email, name, password_hash, is_superadmin)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, email, name, passwordHash, isSuperadmin ? 1 : 0]
    );

    return NextResponse.json({ userId }, { status: 201 });
  } catch (error) {
    console.error("Create user admin error:", error);
    return NextResponse.json(
      { error: "Gagal membuat user." },
      { status: 500 },
    );
  }
}
