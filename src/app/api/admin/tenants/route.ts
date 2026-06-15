import { NextResponse } from "next/server";
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
         t.id, t.name, t.slug, t.owner_uid as ownerUid, t.status, t.plan, t.created_at as createdAt,
         u.name as ownerName, u.email as ownerEmail,
         (SELECT COUNT(*) FROM members m WHERE m.tenant_id = t.id) as memberCount,
         (SELECT COUNT(*) FROM products p WHERE p.tenant_id = t.id) as productCount,
         (SELECT COALESCE(SUM(total_price), 0) FROM transactions tx WHERE tx.tenant_id = t.id AND tx.status = 'completed') as totalRevenue
       FROM tenants t
       LEFT JOIN users u ON u.id = t.owner_uid
       ORDER BY t.created_at DESC`
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Admin tenants error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data tenant." },
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

    const { name, ownerUid, plan } = await request.json();

    if (!name || !ownerUid) {
      return NextResponse.json(
        { error: "Nama dan owner wajib diisi." },
        { status: 400 },
      );
    }

    const tenantId = `${slugify(name)}-${Date.now().toString(36)}`;
    const memberId = uuidv4();
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 30 * 86400000);

    const [users] = await pool.query<RowDataPacket[]>("SELECT email, name FROM users WHERE id = ?", [ownerUid]);
    if (!users.length) {
      return NextResponse.json({ error: "Owner tidak ditemukan." }, { status: 404 });
    }
    const owner = users[0];

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `INSERT INTO tenants (id, name, slug, owner_uid, status, plan, branch_count, settings)
         VALUES (?, ?, ?, ?, 'active', ?, 1, ?)`,
        [
          tenantId,
          name.trim(),
          slugify(name),
          ownerUid,
          plan || 'free',
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
        [memberId, tenantId, ownerUid, owner.email, owner.name, JSON.stringify(["*"])],
      );

      await conn.query(
        `INSERT INTO subscriptions (tenant_id, plan_id, status, trial_ends_at, current_period_start, current_period_end)
         VALUES (?, ?, 'active', ?, ?, ?)`,
        [tenantId, plan || 'free', trialEnd, now, trialEnd],
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return NextResponse.json({ tenantId }, { status: 201 });
  } catch (error) {
    console.error("Create tenant admin error:", error);
    return NextResponse.json(
      { error: "Gagal membuat tenant." },
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
