import { NextResponse } from "next/server";
import { checkPapHealth, getPapProducts } from "@/lib/pap-core";
import { query, initDb, isPostgresConfigured } from "@/lib/db";

export async function GET() {
  const [health, papProducts] = await Promise.all([
    checkPapHealth(),
    getPapProducts(),
  ]);

  return NextResponse.json({
    connected: health.reachable,
    productsCount: papProducts.length,
    products: papProducts,
  });
}

/**
 * Import/Sync products from PAP Core (Stock UMKM) into local POS PostgreSQL database.
 */
export async function POST() {
  try {
    const papProducts = await getPapProducts();

    if (!papProducts || papProducts.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Tidak ada produk yang ditemukan di PAP Core / Stock UMKM.",
        importedCount: 0,
      });
    }

    if (!isPostgresConfigured()) {
      return NextResponse.json({
        success: true,
        message: `Mode demo: Berhasil mensimulasikan impor ${papProducts.length} produk dari PAP Core.`,
        importedCount: papProducts.length,
      });
    }

    await initDb();
    let imported = 0;
    const now = new Date().toISOString();

    for (const item of papProducts) {
      // Check if product with same SKU already exists
      const existing = await query(
        "SELECT id FROM products WHERE sku = $1 LIMIT 1",
        [item.sku]
      );

      if (existing.rows.length === 0) {
        const id = `prod-pap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await query(
          `INSERT INTO products 
            (id, name, price, stock, category_name, sku, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            id,
            item.name,
            item.unit_price || 0,
            50, // Default stock for newly synced product
            item.category || "Umum",
            item.sku,
            now,
            now,
          ]
        );
        imported++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimpor ${imported} produk baru dari PAP Core.`,
      importedCount: imported,
      totalFromPap: papProducts.length,
    });
  } catch (error) {
    console.error("[PAP Sync POST] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mengimpor produk dari PAP Core." },
      { status: 500 }
    );
  }
}
