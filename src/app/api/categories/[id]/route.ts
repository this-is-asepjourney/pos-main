import { NextResponse, type NextRequest } from "next/server";
import pool from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { name } = (await request.json()) as { name: string };

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Nama kategori wajib diisi." },
        { status: 400 },
      );
    }

    await pool.query(
      "UPDATE categories SET name = ? WHERE id = ? AND tenant_id = ?",
      [name.trim(), id, session.tenantId],
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update category error:", error);
    return NextResponse.json(
      { error: "Gagal mengubah kategori." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await pool.query(
      "DELETE FROM categories WHERE id = ? AND tenant_id = ?",
      [id, session.tenantId],
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete category error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus kategori." },
      { status: 500 },
    );
  }
}
