import { NextResponse } from "next/server";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import { signAccessToken, accessTokenCookieOptions, refreshTokenCookieOptions } from "@/lib/auth";
import { verifyPassword, hashPassword, createSession, logAuthAction } from "@/lib/auth-service";

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
      // Simulate delay to prevent timing attacks
      await new Promise(res => setTimeout(res, Math.random() * 200 + 100));
      return NextResponse.json(
        { error: "Email atau password salah." },
        { status: 401 },
      );
    }

    // Check brute-force locking
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return NextResponse.json(
        { error: "Akun terkunci. Silakan coba lagi nanti." },
        { status: 401 },
      );
    }

    const valid = await verifyPassword(password, user.password_hash, user.password_algo || 'bcrypt');
    
    if (!valid) {
      const failCount = (user.failed_login_count || 0) + 1;
      let lockUntil = null;
      
      if (failCount >= 20) {
        lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      } else if (failCount >= 10) {
        lockUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      } else if (failCount >= 5) {
        lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        
        // Notify admin if tenant owner has reached 5 attempts
        if (failCount === 5 && user.default_tenant_id) {
          await pool.query(
            "INSERT INTO admin_notifications (id, target_tenant_id, type, title, message) VALUES (UUID(), ?, 'warning', 'Peringatan Keamanan', 'Terdapat 5 kali percobaan gagal saat login ke akun Anda. Mohon pastikan akun Anda aman.')",
            [user.default_tenant_id]
          );
        }
      }

      await pool.query(
        "UPDATE users SET failed_login_count = ?, locked_until = ?, last_failed_at = NOW() WHERE id = ?",
        [failCount, lockUntil, user.id]
      );
      
      await logAuthAction(user.id, null, "LOGIN_FAILED", request, { failCount });

      return NextResponse.json(
        { error: "Email atau password salah." },
        { status: 401 },
      );
    }

    // Reset login failures on success & Rehash if bcrypt
    let updateQuery = "UPDATE users SET failed_login_count = 0, locked_until = NULL";
    let updateParams: any[] = [];
    
    if (user.password_algo !== 'argon2id') {
      const newHash = await hashPassword(password);
      updateQuery += ", password_hash = ?, password_algo = 'argon2id'";
      updateParams.push(newHash);
    }
    updateQuery += " WHERE id = ?";
    updateParams.push(user.id);
    
    await pool.query(updateQuery, updateParams);

    // Cari membership aktif
    const [members] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM members WHERE user_id = ? AND status = 'active' ORDER BY joined_at ASC",
      [user.id],
    );

    const activeMember = members.find(
      (m) => m.tenant_id === user.default_tenant_id,
    ) ?? members[0] ?? null;

    const role = activeMember?.role ?? "cashier";
    const tenantId = activeMember?.tenant_id ?? null;
    const branchIds = activeMember?.branch_ids
      ? (typeof activeMember.branch_ids === "string"
          ? JSON.parse(activeMember.branch_ids)
          : activeMember.branch_ids)
      : [];

    // Create session
    const { sid, refreshToken } = await createSession(user.id, tenantId, role, branchIds, request);

    // Issue Access Token
    const authVersion = user.auth_version || 1;
    const token = await signAccessToken({
      sid,
      uid: user.id,
      ver: authVersion,
    });

    await logAuthAction(user.id, tenantId, "LOGIN_SUCCESS", request);

    const response = NextResponse.json({
      uid: user.id,
      email: user.email,
      name: user.name,
      tenantId: tenantId,
      role: role,
    });

    response.cookies.set(accessTokenCookieOptions(token));
    response.cookies.set(refreshTokenCookieOptions(refreshToken));
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat login." },
      { status: 500 },
    );
  }
}
