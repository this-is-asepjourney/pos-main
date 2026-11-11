import { NextResponse } from "next/server";
import { query, initDb, isPostgresConfigured } from "@/lib/db";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const payload = await request.json();
    const {
      name,
      price,
      stock,
      categoryId,
      categoryName,
      imageUrl,
      sku,
      barcode,
    } = payload;

    if (!isPostgresConfigured()) {
      return NextResponse.json({ success: true, id, ...payload });
    }

    await initDb();
    const now = new Date().toISOString();

    await query(
      `UPDATE products 
       SET name = $1, 
           price = $2, 
           stock = $3, 
           category_id = $4, 
           category_name = $5, 
           image_url = $6, 
           sku = $7, 
           barcode = $8, 
           updated_at = $9
       WHERE id = $10`,
      [
        name,
        Number(price) || 0,
        Number(stock) || 0,
        categoryId || null,
        categoryName || "",
        imageUrl || "",
        sku || "",
        barcode || "",
        now,
        id,
      ]
    );

    return NextResponse.json({ success: true, id, ...payload });
  } catch (error) {
    console.error("[Products PUT] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mengupdate produk." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!isPostgresConfigured()) {
      return NextResponse.json({ success: true, id });
    }

    await initDb();
    await query("DELETE FROM products WHERE id = $1", [id]);

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("[Products DELETE] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghapus produk." },
      { status: 500 }
    );
  }
}

