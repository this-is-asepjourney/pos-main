import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSuperAdminSession } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         id, name, price_idr as priceIdr, billing_interval as billingInterval,
         max_branches as maxBranches, max_products as maxProducts, max_users as maxUsers,
         transactions_per_month as transactionsPerMonth,
         feature_multi_branch as featureMultiBranch, feature_advanced_reports as featureAdvancedReports,
         feature_excel_export as featureExcelExport, feature_api_access as featureApiAccess,
         feature_loyalty as featureLoyalty, is_active as isActive, created_at as createdAt
       FROM plans
       ORDER BY price_idr ASC`
    );

    return NextResponse.json(rows.map(r => ({
      ...r,
      featureMultiBranch: Boolean(r.featureMultiBranch),
      featureAdvancedReports: Boolean(r.featureAdvancedReports),
      featureExcelExport: Boolean(r.featureExcelExport),
      featureApiAccess: Boolean(r.featureApiAccess),
      featureLoyalty: Boolean(r.featureLoyalty),
      isActive: Boolean(r.isActive)
    })));
  } catch (error) {
    console.error("Admin plans error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data plan." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      id, name, priceIdr, billingInterval, maxBranches, maxProducts, maxUsers, transactionsPerMonth,
      featureMultiBranch, featureAdvancedReports, featureExcelExport, featureApiAccess, featureLoyalty, isActive
    } = await request.json();

    if (!id || !name) {
      return NextResponse.json(
        { error: "ID dan nama plan wajib diisi." },
        { status: 400 },
      );
    }

    // Cek ID sudah dipakai
    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM plans WHERE id = ? LIMIT 1",
      [id],
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "ID Plan sudah ada." },
        { status: 409 },
      );
    }

    await pool.query(
      `INSERT INTO plans (
        id, name, price_idr, billing_interval, max_branches, max_products, max_users,
        transactions_per_month, feature_multi_branch, feature_advanced_reports,
        feature_excel_export, feature_api_access, feature_loyalty, is_active
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, name, priceIdr || 0, billingInterval || 'monthly', maxBranches || 1, maxProducts || 100,
        maxUsers || 3, transactionsPerMonth || 1000,
        featureMultiBranch ? 1 : 0, featureAdvancedReports ? 1 : 0, featureExcelExport ? 1 : 0,
        featureApiAccess ? 1 : 0, featureLoyalty ? 1 : 0, isActive !== false ? 1 : 0
      ]
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Create plan admin error:", error);
    return NextResponse.json(
      { error: "Gagal membuat plan." },
      { status: 500 },
    );
  }
}
