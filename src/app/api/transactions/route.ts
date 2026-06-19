import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const maxItems = Number(searchParams.get("limit") || 50);
    const branchId = searchParams.get("branchId");
    const cashierId = searchParams.get("cashierId");

    let sql = `SELECT * FROM transactions WHERE tenant_id = ?`;
    const params: unknown[] = [session.tenantId];

    if (branchId && branchId !== "*") {
      sql += " AND branch_id = ?";
      params.push(branchId);
    }
    if (cashierId) {
      sql += " AND user_id = ?";
      params.push(cashierId);
    }

    sql += " ORDER BY created_at DESC LIMIT ?";
    params.push(maxItems);

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);

    // Ambil items untuk setiap transaksi
    const transactionIds = rows.map((r) => r.id);
    let itemsMap: Record<string, RowDataPacket[]> = {};

    if (transactionIds.length > 0) {
      const [itemRows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM transaction_items WHERE transaction_id IN (${transactionIds.map(() => "?").join(",")})`,
        transactionIds,
      );

      itemsMap = {};
      for (const item of itemRows) {
        if (!itemsMap[item.transaction_id]) {
          itemsMap[item.transaction_id] = [];
        }
        itemsMap[item.transaction_id].push(item);
      }
    }

    const transactions = rows.map((r) => ({
      id: r.id,
      invoiceCode: r.invoice_code,
      branchId: r.branch_id,
      userId: r.user_id,
      userName: r.user_name,
      totalPrice: Number(r.total_price),
      paidAmount: Number(r.paid_amount),
      changeAmount: Number(r.change_amount),
      paymentMethod: r.payment_method,
      status: r.status,
      items: (itemsMap[r.id] ?? []).map((item) => ({
        productId: item.product_id,
        name: item.name,
        price: Number(item.price),
        qty: item.qty,
        subtotal: Number(item.subtotal),
      })),
      dateKey: r.date_key,
      monthKey: r.month_key,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Get transactions error:", error);
    return NextResponse.json(
      { error: "Gagal memuat transaksi." },
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
      cart: Array<{
        productId: string;
        name: string;
        price: number;
        qty: number;
        stock: number;
        subtotal: number;
        categoryId?: string;
      }>;
      totalPrice: number;
      paidAmount: number;
      paymentMethod: string;
      userId: string;
      userName: string;
      branchId: string;
      voucherCode?: string;
      manualDiscount?: any;
    };

    if (!body.cart?.length) {
      return NextResponse.json(
        { error: "Keranjang masih kosong." },
        { status: 400 },
      );
    }

    const { discountService } = await import("@/lib/services/discount-service");
    const { calculateOrder } = await import("@/lib/pricing-engine");

    const [tenantRows] = await pool.query<RowDataPacket[]>(
      "SELECT tax_rate, tax_inclusive FROM tenants WHERE id = ?",
      [session.tenantId]
    );
    const taxRate = tenantRows[0]?.tax_rate ? Number(tenantRows[0].tax_rate) : 0;
    const taxInclusive = Boolean(tenantRows[0]?.tax_inclusive);

    const [rules, voucher] = await Promise.all([
      discountService.getActiveRules(session.tenantId),
      body.voucherCode ? discountService.getVoucher(session.tenantId, body.voucherCode) : null
    ]);

    const pricingResult = calculateOrder({
      tenantId: session.tenantId,
      cart: body.cart,
      voucherCode: body.voucherCode,
      manualDiscount: body.manualDiscount,
      taxRate,
      taxInclusive
    }, rules, voucher);

    if (pricingResult.errors && pricingResult.errors.length > 0) {
      return NextResponse.json(
        { error: pricingResult.errors.join(", ") },
        { status: 400 },
      );
    }

    if (body.paidAmount < pricingResult.total && body.paymentMethod !== 'qris') {
      return NextResponse.json(
        { error: "Nominal bayar kurang dari total belanja." },
        { status: 400 },
      );
    }

    const transactionId = uuidv4();
    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10);
    const monthKey = now.toISOString().slice(0, 7);
    const datePart = dateKey.replaceAll("-", "");
    const invoiceCode = `INV-${datePart}-${now.getTime().toString().slice(-6)}`;
    const branchId = body.branchId || "main";

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Cek stok dan update
      for (const item of body.cart) {
        const [productRows] = await conn.query<RowDataPacket[]>(
          "SELECT stock_by_branch, total_stock FROM products WHERE id = ? AND tenant_id = ? FOR UPDATE",
          [item.productId, session.tenantId],
        );

        if (!productRows[0]) {
          throw new Error(`Produk ${item.name} tidak ditemukan.`);
        }

        const stockByBranch =
          typeof productRows[0].stock_by_branch === "string"
            ? JSON.parse(productRows[0].stock_by_branch)
            : productRows[0].stock_by_branch ?? {};

        const branchStock = Number(stockByBranch[branchId] ?? productRows[0].total_stock ?? 0);
        if (branchStock < item.qty) {
          throw new Error(`Stok ${item.name} tersisa ${branchStock}.`);
        }

        stockByBranch[branchId] = (stockByBranch[branchId] ?? 0) - item.qty;
        const newTotal = (productRows[0].total_stock ?? 0) - item.qty;

        await conn.query(
          "UPDATE products SET stock_by_branch = ?, total_stock = ? WHERE id = ? AND tenant_id = ?",
          [JSON.stringify(stockByBranch), newTotal, item.productId, session.tenantId],
        );
      }

      // Simpan transaksi
      await conn.query(
        `INSERT INTO transactions (id, tenant_id, invoice_code, branch_id, user_id, user_name,
         total_price, paid_amount, change_amount, payment_method, status, date_key, month_key,
         subtotal, tax_amount, discount_amount, discount_snapshot)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?)`,
        [
          transactionId,
          session.tenantId,
          invoiceCode,
          branchId,
          body.userId,
          body.userName,
          pricingResult.total,
          body.paidAmount,
          body.paymentMethod === 'qris' ? 0 : body.paidAmount - pricingResult.total,
          body.paymentMethod,
          dateKey,
          monthKey,
          pricingResult.subtotal,
          pricingResult.taxAmount,
          pricingResult.discountAmount,
          JSON.stringify(pricingResult.appliedDiscounts),
        ],
      );

      // Simpan items
      for (const item of body.cart) {
        await conn.query(
          `INSERT INTO transaction_items (transaction_id, product_id, name, price, qty, subtotal)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [transactionId, item.productId, item.name, item.price, item.qty, item.subtotal],
        );
      }

      // Save transaction discounts
      await discountService.saveTransactionDiscounts(
        transactionId,
        session.tenantId,
        pricingResult.appliedDiscounts,
        conn
      );

      // Update voucher usage
      const appliedVoucher = pricingResult.appliedDiscounts.find(ad => ad.type === "VOUCHER");
      if (appliedVoucher && appliedVoucher.id) {
        await discountService.markVoucherUsed(session.tenantId, appliedVoucher.id, conn);
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const { logActivity } = await import("@/lib/activity");
    await logActivity({
      tenantId: session.tenantId,
      userId: body.userId || session.uid,
      userName: body.userName || session.name,
      action: "CREATE_TRANSACTION",
      description: `Membuat transaksi dengan invoice: ${invoiceCode} senilai Rp${pricingResult.total.toLocaleString()}`,
      metadata: { invoiceCode, total: pricingResult.total, subtotal: pricingResult.subtotal, discount: pricingResult.discountAmount, tax: pricingResult.taxAmount, items: body.cart.length }
    });

    return NextResponse.json({ invoiceCode }, { status: 201 });
  } catch (error) {
    console.error("Checkout error:", error);
    const message = error instanceof Error ? error.message : "Checkout gagal diproses.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
