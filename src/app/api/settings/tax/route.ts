import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT tax_rate, tax_inclusive FROM tenants WHERE id = ?",
      [session.tenantId]
    );

    if (!rows.length) {
      return NextResponse.json({ error: "Tenant tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      taxRate: Number(rows[0].tax_rate),
      taxInclusive: Boolean(rows[0].tax_inclusive),
    });
  } catch (error) {
    console.error("Get tax settings error:", error);
    return NextResponse.json({ error: "Gagal mengambil pengaturan pajak" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Hanya admin/owner yang bisa mengubah pengaturan pajak
    if (session.role !== "owner" && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const taxRate = Math.max(0, Number(body.taxRate) || 0);
    const taxInclusive = Boolean(body.taxInclusive);

    await pool.query(
      "UPDATE tenants SET tax_rate = ?, tax_inclusive = ? WHERE id = ?",
      [taxRate, taxInclusive, session.tenantId]
    );

    return NextResponse.json({ success: true, taxRate, taxInclusive });
  } catch (error) {
    console.error("Update tax settings error:", error);
    return NextResponse.json({ error: "Gagal memperbarui pengaturan pajak" }, { status: 500 });
  }
}
