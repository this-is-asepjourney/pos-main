import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { discountService } from "@/lib/services/discount-service";
import { calculateOrder } from "@/lib/pricing-engine";
import type { PricingPayload } from "@/types/pricing";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<PricingPayload>;
    
    if (!body.cart || !Array.isArray(body.cart)) {
      return NextResponse.json({ error: "Keranjang tidak valid" }, { status: 400 });
    }

    // Ambil tenant settings untuk tax_rate dan tax_inclusive
    const [tenantRows] = await pool.query<RowDataPacket[]>(
      "SELECT tax_rate, tax_inclusive FROM tenants WHERE id = ?",
      [session.tenantId]
    );

    const taxRate = tenantRows[0]?.tax_rate ? Number(tenantRows[0].tax_rate) : 0;
    const taxInclusive = Boolean(tenantRows[0]?.tax_inclusive);

    // Persiapkan payload
    const payload: PricingPayload = {
      tenantId: session.tenantId,
      cart: body.cart,
      voucherCode: body.voucherCode,
      manualDiscount: body.manualDiscount,
      taxRate,
      taxInclusive,
    };

    // Load active rules and voucher
    const [rules, voucher] = await Promise.all([
      discountService.getActiveRules(session.tenantId),
      body.voucherCode ? discountService.getVoucher(session.tenantId, body.voucherCode) : null
    ]);

    // Hitung order
    const result = calculateOrder(payload, rules, voucher);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Calculate API error:", error);
    return NextResponse.json({ error: "Gagal menghitung keranjang" }, { status: 500 });
  }
}
