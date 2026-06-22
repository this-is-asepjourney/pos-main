import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSuperAdminSession } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

/**
 * GET /api/admin/subscription-requests?status=pending|approved|rejected|all
 * Lists subscription requests for superadmin.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search") || "";

    let whereClause = "WHERE 1=1";
    const params: any[] = [];

    if (status && status !== "all") {
      whereClause += " AND sr.status = ?";
      params.push(status);
    }

    if (search) {
      whereClause += " AND (sr.tenant_name LIKE ? OR sr.requested_plan_name LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         sr.id, sr.tenant_id as tenantId, sr.tenant_name as tenantName,
         sr.requested_plan_id as requestedPlanId, sr.requested_plan_name as requestedPlanName,
         sr.current_plan_id as currentPlanId, sr.payment_method as paymentMethod,
         sr.payment_proof_note as paymentProofNote, sr.payment_proof_url as paymentProofUrl, sr.amount_idr as amountIdr,
         sr.status, sr.admin_note as adminNote,
         sr.approved_by as approvedBy, sr.approved_at as approvedAt,
         sr.rejected_at as rejectedAt, sr.created_at as createdAt,
         sr.updated_at as updatedAt,
         t.slug as tenantSlug, t.plan as tenantCurrentPlan, t.status as tenantStatus,
         u.name as ownerName, u.email as ownerEmail,
         au.name as approvedByName
       FROM subscription_requests sr
       LEFT JOIN tenants t ON t.id = sr.tenant_id
       LEFT JOIN users u ON u.id = t.owner_uid
       LEFT JOIN users au ON au.id = sr.approved_by
       ${whereClause}
       ORDER BY 
         CASE sr.status WHEN 'pending' THEN 0 ELSE 1 END,
         sr.created_at DESC
       LIMIT 100`,
      params
    );

    // Stats summary
    const [stats] = await pool.query<RowDataPacket[]>(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
         SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
         SUM(CASE WHEN status = 'approved' THEN amount_idr ELSE 0 END) as totalApprovedRevenue
       FROM subscription_requests`
    );

    return NextResponse.json({
      requests: rows,
      stats: stats[0] ?? { total: 0, pending: 0, approved: 0, rejected: 0, totalApprovedRevenue: 0 },
    });
  } catch (error) {
    console.error("Admin subscription requests error:", error);
    return NextResponse.json({ error: "Gagal memuat data subscription requests." }, { status: 500 });
  }
}
