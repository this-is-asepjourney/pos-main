import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSuperAdminSession } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const { name, status, plan } = await request.json();

    if (!name || !status || !plan) {
      return NextResponse.json(
        { error: "Nama, status, dan plan wajib diisi." },
        { status: 400 },
      );
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        "UPDATE tenants SET name = ?, status = ?, plan = ? WHERE id = ?",
        [name, status, plan, id]
      );

      await conn.query(
        "UPDATE subscriptions SET plan_id = ?, status = ? WHERE tenant_id = ?",
        [plan, status, id]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update tenant admin error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui tenant." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // Database is setup with ON DELETE CASCADE, so deleting the tenant will delete members, products, transactions, etc.
    await pool.query("DELETE FROM tenants WHERE id = ?", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete tenant admin error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus tenant." },
      { status: 500 },
    );
  }
}
