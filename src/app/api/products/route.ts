import { NextResponse } from "next/server";
import { query, initDb, isPostgresConfigured } from "@/lib/db";
import { demoProducts } from "@/lib/demo-data";
import type { Product } from "@/types/pos";

export async function GET() {
  if (!isPostgresConfigured()) {
    return NextResponse.json(demoProducts);
  }

  try {
    await initDb();
    const res = await query(
      `SELECT 
        id, 
        name, 
        price::float as price, 
        stock::int as stock, 
        category_id as "categoryId", 
        category_name as "categoryName", 
        image_url as "imageUrl", 
        sku, 
        barcode, 
        created_at as "createdAt", 
        updated_at as "updatedAt"
       FROM products 
       ORDER BY name ASC`
    );

    return NextResponse.json(res.rows);
  } catch (error) {
    console.error("[Products GET] Error:", error);
    return NextResponse.json(demoProducts);
  }
}

export async function POST(request: Request) {
  try {
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

    if (!name) {
      return NextResponse.json(
        { error: "Nama produk wajib diisi." },
        { status: 400 }
      );
    }

    const id = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    if (!isPostgresConfigured()) {
      const mockProduct: Product = {
        id,
        name,
        price: Number(price) || 0,
        stock: Number(stock) || 0,
        categoryId: categoryId || "",
        categoryName: categoryName || "",
        imageUrl: imageUrl || "",
        sku: sku || "",
        barcode: barcode || "",
        createdAt: now,
        updatedAt: now,
      };
      return NextResponse.json(mockProduct, { status: 201 });
    }

    await initDb();
    await query(
      `INSERT INTO products (id, name, price, stock, category_id, category_name, image_url, sku, barcode, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        name,
        Number(price) || 0,
        Number(stock) || 0,
        categoryId || null,
        categoryName || "",
        imageUrl || "",
        sku || "",
        barcode || "",
        now,
        now,
      ]
    );

    const created: Product = {
      id,
      name,
      price: Number(price) || 0,
      stock: Number(stock) || 0,
      categoryId: categoryId || "",
      categoryName: categoryName || "",
      imageUrl: imageUrl || "",
      sku: sku || "",
      barcode: barcode || "",
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[Products POST] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menambahkan produk." },
      { status: 500 }
    );
  }
}

