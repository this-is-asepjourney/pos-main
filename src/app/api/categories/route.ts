import { NextResponse } from "next/server";
import { query, initDb, isPostgresConfigured } from "@/lib/db";
import { demoCategories } from "@/lib/demo-data";
import type { Category } from "@/types/pos";

export async function GET() {
  if (!isPostgresConfigured()) {
    return NextResponse.json(demoCategories);
  }

  try {
    await initDb();
    const res = await query(
      `SELECT id, name, created_at as "createdAt" 
       FROM categories 
       ORDER BY name ASC`
    );

    return NextResponse.json(res.rows);
  } catch (error) {
    console.error("[Categories GET] Error:", error);
    return NextResponse.json(demoCategories);
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Nama kategori wajib diisi." },
        { status: 400 }
      );
    }

    const id = `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    if (!isPostgresConfigured()) {
      const mockCategory: Category = {
        id,
        name: name.trim(),
        createdAt: now,
      };
      return NextResponse.json(mockCategory, { status: 201 });
    }

    await initDb();
    await query("INSERT INTO categories (id, name, created_at) VALUES ($1, $2, $3)", [
      id,
      name.trim(),
      now,
    ]);

    const created: Category = {
      id,
      name: name.trim(),
      createdAt: now,
    };

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[Categories POST] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menambahkan kategori." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name } = await request.json();

    if (!id || !name?.trim()) {
      return NextResponse.json(
        { error: "ID dan nama kategori wajib diisi." },
        { status: 400 }
      );
    }

    if (isPostgresConfigured()) {
      await initDb();
      await query("UPDATE categories SET name = $1 WHERE id = $2", [name.trim(), id]);
    }

    return NextResponse.json({ success: true, id, name: name.trim() });
  } catch (error) {
    console.error("[Categories PUT] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mengupdate kategori." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID kategori wajib diisi." }, { status: 400 });
    }

    if (isPostgresConfigured()) {
      await initDb();
      await query("DELETE FROM categories WHERE id = $1", [id]);
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("[Categories DELETE] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghapus kategori." },
      { status: 500 }
    );
  }
}
