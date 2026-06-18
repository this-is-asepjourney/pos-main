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
      `SELECT id, name, name_lower, price, category_id, category_name,
              image_url, sku, barcode, is_active, stock_by_branch, total_stock,
              created_at, updated_at
       FROM products
       WHERE tenant_id = ?
       ORDER BY name ASC`,
      [session.tenantId],
    );

    const products = rows.map((r) => ({
      id: r.id,
      name: r.name,
      nameLower: r.name_lower,
      price: Number(r.price),
      stock: r.total_stock ?? 0,
      categoryId: r.category_id ?? "",
      categoryName: r.category_name ?? "",
      imageUrl: r.image_url || undefined,
      sku: r.sku || undefined,
      barcode: r.barcode || undefined,
      isActive: Boolean(r.is_active),
      stockByBranch:
        typeof r.stock_by_branch === "string"
          ? JSON.parse(r.stock_by_branch)
          : r.stock_by_branch ?? {},
      totalStock: r.total_stock ?? 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return NextResponse.json(products);
  } catch (error) {
    console.error("Get products error:", error);
    return NextResponse.json(
      { error: "Gagal memuat produk." },
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

    const body = (await request.json()) as {
      name: string;
      price: number;
      stock: number;
      categoryId: string;
      categoryName: string;
      imageUrl?: string;
      sku?: string;
      barcode?: string;
      branchId?: string;
    };

    const id = uuidv4();
    const branchId = body.branchId ?? "main";
    const stock = Math.max(0, Math.floor(Number(body.stock) || 0));
    const stockByBranch = { [branchId]: stock };

    await pool.query(
      `INSERT INTO products (id, tenant_id, name, name_lower, price, category_id, category_name,
                             image_url, sku, barcode, is_active, stock_by_branch, total_stock)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?)`,
      [
        id,
        session.tenantId,
        body.name,
        body.name.toLowerCase(),
        Number(body.price) || 0,
        body.categoryId,
        body.categoryName,
        body.imageUrl ?? "",
        body.sku ?? "",
        body.barcode ?? "",
        JSON.stringify(stockByBranch),
        stock,
      ],
    );

    const { logActivity } = await import("@/lib/activity");
    await logActivity({
      tenantId: session.tenantId,
      userId: session.uid,
      userName: session.name,
      action: "ADD_PRODUCT",
      description: `Menambahkan produk baru: ${body.name}`,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan produk." },
      { status: 500 },
    );
  }
}
