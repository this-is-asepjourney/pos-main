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
      "SELECT id, name, created_at, updated_at FROM categories WHERE tenant_id = ? ORDER BY name ASC",
      [session.tenantId],
    );

    const categories = rows.map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.created_at,
    }));

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Get categories error:", error);
    return NextResponse.json(
      { error: "Gagal memuat kategori." },
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

    const { name } = (await request.json()) as { name: string };

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Nama kategori wajib diisi." },
        { status: 400 },
      );
    }

    const id = uuidv4();

    await pool.query(
      "INSERT INTO categories (id, tenant_id, name) VALUES (?, ?, ?)",
      [id, session.tenantId, name.trim()],
    );

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan kategori." },
      { status: 500 },
    );
  }
}
