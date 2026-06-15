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

    const branchId = body.branchId ?? "main";
    const stock = Math.max(0, Math.floor(Number(body.stock) || 0));
    const stockByBranch = { [branchId]: stock };

    await pool.query(
      `UPDATE products SET name = ?, name_lower = ?, price = ?, category_id = ?,
       category_name = ?, image_url = ?, sku = ?, barcode = ?, is_active = TRUE,
       stock_by_branch = ?, total_stock = ?
       WHERE id = ? AND tenant_id = ?`,
      [
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
        id,
        session.tenantId,
      ],
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json(
      { error: "Gagal mengubah produk." },
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
      "DELETE FROM products WHERE id = ? AND tenant_id = ?",
      [id, session.tenantId],
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus produk." },
      { status: 500 },
    );
  }
}
