import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import pool from "@/lib/db";
import { getSession, signToken, sessionCookieOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = (await request.json()) as { name: string };

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Nama toko wajib diisi." },
        { status: 400 },
      );
    }

    const tenantId = `${slugify(name)}-${Date.now().toString(36)}`;
    const memberId = uuidv4();
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 30 * 86400000);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `INSERT INTO tenants (id, name, slug, owner_uid, status, plan, branch_count, settings)
         VALUES (?, ?, ?, ?, 'trial', 'free', 1, ?)`,
        [
          tenantId,
          name.trim(),
          slugify(name),
          session.uid,
          JSON.stringify({
            currency: "IDR",
            taxRate: 0,
            timezone: "Asia/Jakarta",
            receiptFooter: `Terima kasih, ${name.trim()}.`,
          }),
        ],
      );

      await conn.query(
        "INSERT INTO branches (id, tenant_id, name, is_active) VALUES ('main', ?, 'Cabang Utama', TRUE)",
        [tenantId],
      );

      await conn.query(
        `INSERT INTO members (id, tenant_id, user_id, email, name, role, branch_ids, status)
         VALUES (?, ?, ?, ?, ?, 'owner', ?, 'active')`,
        [memberId, tenantId, session.uid, session.email, session.name, JSON.stringify(["*"])],
      );

      await conn.query(
        `INSERT INTO subscriptions (tenant_id, plan_id, status, trial_ends_at, current_period_start, current_period_end)
         VALUES (?, 'free', 'trial', ?, ?, ?)`,
        [tenantId, trialEnd, now, trialEnd],
      );

      await conn.query(
        "UPDATE users SET default_tenant_id = ? WHERE id = ?",
        [tenantId, session.uid],
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    // Update session token dengan tenant baru
    const token = await signToken({
      uid: session.uid,
      email: session.email,
      name: session.name,
      tenantId,
      role: "owner",
      branchIds: ["*"],
      isSuperAdmin: Boolean(session.isSuperAdmin),
    });

    const response = NextResponse.json({ tenantId }, { status: 201 });
    response.cookies.set(sessionCookieOptions(token));
    return response;
  } catch (error) {
    console.error("Create tenant error:", error);
    return NextResponse.json(
      { error: "Gagal membuat toko." },
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
