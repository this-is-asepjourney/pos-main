import { NextResponse } from "next/server";
import { getPool, initDb, isPostgresConfigured } from "@/lib/db";
import { notifyPapCheckout } from "@/lib/pap-core";
import { demoTransactions } from "@/lib/demo-data";
import type { CheckoutPayload, PosTransaction } from "@/types/pos";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const maxItems = Number(searchParams.get("limit")) || 50;

  if (!isPostgresConfigured()) {
    return NextResponse.json(demoTransactions.slice(0, maxItems));
  }

  try {
    await initDb();
    const pool = getPool();
    const res = await pool.query(
      `SELECT 
        id, 
        invoice_code as "invoiceCode", 
        user_id as "userId", 
        user_name as "userName", 
        total_price::float as "totalPrice", 
        paid_amount::float as "paidAmount", 
        change_amount::float as "changeAmount", 
        payment_method as "paymentMethod", 
        items, 
        created_at as "createdAt", 
        updated_at as "updatedAt"
       FROM transactions 
       ORDER BY created_at DESC 
       LIMIT $1`,
      [maxItems]
    );

    return NextResponse.json(res.rows);
  } catch (error) {
    console.error("[Transactions GET] Error:", error);
    return NextResponse.json(demoTransactions.slice(0, maxItems));
  }
}

export async function POST(request: Request) {
  try {
    const payload: CheckoutPayload = await request.json();
    const { cart, totalPrice, paidAmount, paymentMethod, userId, userName } = payload;

    if (!cart || cart.length === 0) {
      return NextResponse.json(
        { error: "Keranjang belanja tidak boleh kosong." },
        { status: 400 }
      );
    }

    const date = new Date();
    const datePart = date.toISOString().slice(0, 10).replaceAll("-", "");
    const invoiceCode = `INV-${datePart}-${date.getTime().toString().slice(-6)}`;
    const changeAmount = Math.max(0, paidAmount - totalPrice);
    const id = `trx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = date.toISOString();

    const transactionRecord: PosTransaction = {
      id,
      invoiceCode,
      userId: userId || "cashier",
      userName: userName || "Kasir",
      totalPrice,
      paidAmount,
      changeAmount,
      paymentMethod,
      items: cart.map((item) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        qty: item.qty,
        subtotal: item.subtotal,
      })),
      createdAt: now,
      updatedAt: now,
    };

    if (isPostgresConfigured()) {
      await initDb();
      const pool = getPool();
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        // 1. Insert transaction
        await client.query(
          `INSERT INTO transactions 
            (id, invoice_code, user_id, user_name, total_price, paid_amount, change_amount, payment_method, items, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            id,
            invoiceCode,
            transactionRecord.userId,
            transactionRecord.userName,
            totalPrice,
            paidAmount,
            changeAmount,
            paymentMethod,
            JSON.stringify(transactionRecord.items),
            now,
            now,
          ]
        );

        // 2. Decrement stock for each item
        for (const item of cart) {
          await client.query(
            `UPDATE products 
             SET stock = GREATEST(0, stock - $1), 
                 updated_at = $2 
             WHERE id = $3`,
            [item.qty, now, item.productId]
          );
        }

        await client.query("COMMIT");
      } catch (dbErr) {
        await client.query("ROLLBACK");
        throw dbErr;
      } finally {
        client.release();
      }
    }

    // 3. Notify PAP Core in background for Stock UMKM sync
    notifyPapCheckout({
      invoiceCode,
      items: transactionRecord.items,
      totalPrice,
    }).catch((papErr) => {
      console.warn("[PAP Core Notification] Async error:", papErr);
    });

    return NextResponse.json({
      success: true,
      invoiceCode,
      transaction: transactionRecord,
    }, { status: 201 });
  } catch (error) {
    console.error("[Transactions POST] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memproses transaksi checkout." },
      { status: 500 }
    );
  }
}

