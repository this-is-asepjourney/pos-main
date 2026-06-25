import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import pool from "@/lib/db";
import { signToken, sessionCookieOptions } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function POST(request: Request) {
  try {
    const { email, password, name, tenantName } = (await request.json()) as {
      email?: string;
      password?: string;
      name?: string;
      tenantName?: string;
    };

    if (!email || !password || !name || !tenantName) {
      return NextResponse.json(
        { error: "Semua field wajib diisi." },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter." },
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
    const tenantId = `${slugify(tenantName)}-${Date.now().toString(36)}`;
    const passwordHash = await bcrypt.hash(password, 12);
    const memberId = uuidv4();
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 30 * 86400000);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Buat user
      await conn.query(
        `INSERT INTO users (id, email, name, password_hash, default_tenant_id)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, email, name, passwordHash, tenantId],
      );

      // Buat tenant
      await conn.query(
        `INSERT INTO tenants (id, name, slug, owner_uid, status, plan, branch_count, settings)
         VALUES (?, ?, ?, ?, 'trial', 'free', 1, ?)`,
        [
          tenantId,
          tenantName,
          slugify(tenantName),
          userId,
          JSON.stringify({
            currency: "IDR",
            taxRate: 0,
            timezone: "Asia/Jakarta",
            receiptFooter: `Terima kasih, ${tenantName}.`,
          }),
        ],
      );

      // Buat branch utama
      await conn.query(
        `INSERT INTO branches (id, tenant_id, name, is_active)
         VALUES ('main', ?, 'Cabang Utama', TRUE)`,
        [tenantId],
      );

      // Buat membership owner
      await conn.query(
        `INSERT INTO members (id, tenant_id, user_id, email, name, role, branch_ids, status)
         VALUES (?, ?, ?, ?, ?, 'owner', ?, 'active')`,
        [memberId, tenantId, userId, email, name, JSON.stringify(["*"])],
      );

      // Buat subscription trial
      await conn.query(
        `INSERT INTO subscriptions (tenant_id, plan_id, status, trial_ends_at, current_period_start, current_period_end)
         VALUES (?, 'free', 'trial', ?, ?, ?)`,
        [tenantId, trialEnd, now, trialEnd],
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const { createSession, logAuthAction } = await import("@/lib/auth-service");
    const { signAccessToken, accessTokenCookieOptions, refreshTokenCookieOptions } = await import("@/lib/auth");

    const { sid, refreshToken } = await createSession(userId, tenantId, "owner", ["*"], request);
    
    const token = await signAccessToken({
      sid,
      uid: userId,
      ver: 1,
    });

    await logAuthAction(userId, tenantId, "REGISTER_SUCCESS", request);

    const response = NextResponse.json({
      uid: userId,
      email,
      name,
      tenantId,
      role: "owner",
    });

    response.cookies.set(accessTokenCookieOptions(token));
    response.cookies.set(refreshTokenCookieOptions(refreshToken));
    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat registrasi." },
      { status: 500 },
    );
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 40) || "tenant";
}
