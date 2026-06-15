import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSuperAdminSession } from "@/lib/auth";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const {
      name, priceIdr, billingInterval, maxBranches, maxProducts, maxUsers, transactionsPerMonth,
      featureMultiBranch, featureAdvancedReports, featureExcelExport, featureApiAccess, featureLoyalty, isActive
    } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Nama plan wajib diisi." },
        { status: 400 },
      );
    }

    await pool.query(
      `UPDATE plans SET 
        name = ?, price_idr = ?, billing_interval = ?, max_branches = ?, max_products = ?, max_users = ?,
        transactions_per_month = ?, feature_multi_branch = ?, feature_advanced_reports = ?,
        feature_excel_export = ?, feature_api_access = ?, feature_loyalty = ?, is_active = ?
       WHERE id = ?`,
      [
        name, priceIdr || 0, billingInterval || 'monthly', maxBranches || 1, maxProducts || 100,
        maxUsers || 3, transactionsPerMonth || 1000,
        featureMultiBranch ? 1 : 0, featureAdvancedReports ? 1 : 0, featureExcelExport ? 1 : 0,
        featureApiAccess ? 1 : 0, featureLoyalty ? 1 : 0, isActive !== false ? 1 : 0,
        id
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update plan admin error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui plan." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // Optional: prevent deleting if there are active subscriptions
    // Just simple delete for now

    await pool.query("DELETE FROM plans WHERE id = ?", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete plan admin error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus plan." },
      { status: 500 },
    );
  }
}
