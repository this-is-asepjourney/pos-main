import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

/** GET /api/subscription — returns current tenant's subscription + available plans */
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Current subscription
    const [subs] = await pool.query<RowDataPacket[]>(
      `SELECT 
         s.plan_id as planId, s.status, s.trial_ends_at as trialEndsAt,
         s.current_period_start as periodStart, s.current_period_end as periodEnd,
         s.last_payment_at as lastPaymentAt, s.payment_method as paymentMethod,
         s.cancelled_at as cancelledAt,
         t.name as tenantName, t.plan as tenantPlan,
         (SELECT COUNT(*) FROM members m WHERE m.tenant_id = ? AND m.status='active') as memberCount,
         (SELECT COUNT(*) FROM products p WHERE p.tenant_id = ?) as productCount,
         (SELECT COUNT(*) FROM transactions tx WHERE tx.tenant_id = ? AND DATE(tx.created_at) >= DATE_FORMAT(NOW(), '%Y-%m-01')) as txThisMonth
       FROM subscriptions s
       JOIN tenants t ON t.id = s.tenant_id
       WHERE s.tenant_id = ?
       LIMIT 1`,
      [session.tenantId, session.tenantId, session.tenantId, session.tenantId]
    );

    // All active plans
    const [plans] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, price_idr as priceIdr, billing_interval as billingInterval,
              max_branches as maxBranches, max_products as maxProducts, max_users as maxUsers,
              transactions_per_month as transactionsPerMonth,
              feature_multi_branch as featureMultiBranch,
              feature_advanced_reports as featureAdvancedReports,
              feature_excel_export as featureExcelExport,
              feature_api_access as featureApiAccess,
              feature_loyalty as featureLoyalty
       FROM plans WHERE is_active = 1 ORDER BY price_idr ASC`
    );

    // Payment history (last 6)
    const [payments] = await pool.query<RowDataPacket[]>(
      `SELECT id, invoice_code as invoiceCode, total_price as totalPrice,
              payment_method as paymentMethod, status, created_at as createdAt
       FROM transactions
       WHERE tenant_id = ?
       ORDER BY created_at DESC
       LIMIT 6`,
      [session.tenantId]
    );

    return NextResponse.json({
      subscription: subs[0] ?? null,
      plans: plans.map(p => ({
        ...p,
        featureMultiBranch: Boolean(p.featureMultiBranch),
        featureAdvancedReports: Boolean(p.featureAdvancedReports),
        featureExcelExport: Boolean(p.featureExcelExport),
        featureApiAccess: Boolean(p.featureApiAccess),
        featureLoyalty: Boolean(p.featureLoyalty),
      })),
      recentActivity: payments,
    });
  } catch (error) {
    console.error("Subscription GET error:", error);
    return NextResponse.json({ error: "Gagal memuat data subscription." }, { status: 500 });
  }
}
