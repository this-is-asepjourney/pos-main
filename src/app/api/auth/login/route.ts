import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { signToken, sessionCookieOptions } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function POST(request: Request) {
  try {
    const { email, password } = (await request.json()) as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi." },
        { status: 400 },
      );
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    const user = rows[0];
    if (!user) {
      return NextResponse.json(
        { error: "Email atau password salah." },
        { status: 401 },
      );
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await pool.query("UPDATE users SET failed_login_count = failed_login_count + 1 WHERE id = ?", [user.id]);
      
      const newFailCount = user.failed_login_count + 1;
      if (newFailCount >= 5 && user.default_tenant_id) {
        // Send notification & reset
        await pool.query("UPDATE users SET failed_login_count = 0 WHERE id = ?", [user.id]);
        await pool.query(
          "INSERT INTO admin_notifications (id, target_tenant_id, type, title, message) VALUES (UUID(), ?, 'warning', 'Peringatan Keamanan', 'Terdapat 5 kali percobaan gagal saat login ke akun Anda. Mohon pastikan akun Anda aman.')",
          [user.default_tenant_id]
        );
      }
      
      return NextResponse.json(
        { error: "Email atau password salah." },
        { status: 401 },
      );
    }

    // Reset login failures on success
    if (user.failed_login_count > 0) {
      await pool.query("UPDATE users SET failed_login_count = 0 WHERE id = ?", [user.id]);
    }

    // Cari membership aktif
    const [members] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM members WHERE user_id = ? AND status = 'active' ORDER BY joined_at ASC",
      [user.id],
    );

    const activeMember = members.find(
      (m) => m.tenant_id === user.default_tenant_id,
    ) ?? members[0] ?? null;

    const token = await signToken({
      uid: user.id,
      email: user.email,
      name: user.name,
      tenantId: activeMember?.tenant_id ?? null,
      role: activeMember?.role ?? "cashier",
      branchIds: activeMember?.branch_ids
        ? (typeof activeMember.branch_ids === "string"
            ? JSON.parse(activeMember.branch_ids)
            : activeMember.branch_ids)
        : [],
      isSuperAdmin: Boolean(user.is_superadmin),
    });

    const response = NextResponse.json({
      uid: user.id,
      email: user.email,
      name: user.name,
      tenantId: activeMember?.tenant_id ?? null,
      role: activeMember?.role ?? "cashier",
    });

    response.cookies.set(sessionCookieOptions(token));
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat login." },
      { status: 500 },
    );
  }
}
