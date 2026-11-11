import { NextResponse } from "next/server";
import { query, initDb, isPostgresConfigured } from "@/lib/db";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { qty } = await request.json();

    const amount = Math.floor(Number(qty));
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Jumlah restock harus lebih dari 0." },
        { status: 400 }
      );
    }

    if (!isPostgresConfigured()) {
      return NextResponse.json({ success: true, id, addedQty: amount });
    }

    await initDb();
    const res = await query(
      `UPDATE products 
       SET stock = stock + $1, 
           updated_at = NOW() 
       WHERE id = $2 
       RETURNING id, stock::int as stock`,
      [amount, id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ success: true, product: res.rows[0] });
  } catch (error) {
    console.error("[Restock POST] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal restock produk." },
      { status: 500 }
    );
  }
}

