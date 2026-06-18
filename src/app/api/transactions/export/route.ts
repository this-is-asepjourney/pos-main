import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";
import * as xlsx from "xlsx";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Cek Plan Tenant
    const [planRows] = await pool.query<RowDataPacket[]>(`
      SELECT p.feature_excel_export 
      FROM tenants t 
      JOIN plans p ON t.plan = p.id 
      WHERE t.id = ? LIMIT 1
    `, [session.tenantId]);

    const hasExcelFeature = planRows[0]?.feature_excel_export;

    if (!hasExcelFeature) {
      // Return 403 Forbidden agar UI bisa menangani error plan
      return NextResponse.json(
        { error: "Paket langganan Anda saat ini tidak mendukung fitur Export Excel." },
        { status: 403 }
      );
    }

    // 2. Ambil data transaksi
    const [txRows] = await pool.query<RowDataPacket[]>(
      `SELECT invoice_code, user_name, payment_method, total_price, status, created_at 
       FROM transactions 
       WHERE tenant_id = ? 
       ORDER BY created_at DESC`,
      [session.tenantId]
    );

    const data = txRows.map((tx) => ({
      "Invoice": tx.invoice_code,
      "Tanggal": new Date(tx.created_at).toLocaleString("id-ID"),
      "Kasir": tx.user_name,
      "Metode Bayar": tx.payment_method,
      "Status": tx.status,
      "Total": Number(tx.total_price),
    }));

    // 3. Buat file Excel
    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Transaksi");

    const excelBuffer = xlsx.write(workbook, { bookType: "xlsx", type: "buffer" });

    // 4. Return file sebagai download
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="Laporan_Transaksi_${new Date().toISOString().split('T')[0]}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });

  } catch (error) {
    console.error("Export Excel error:", error);
    return NextResponse.json(
      { error: "Gagal membuat file Excel." },
      { status: 500 }
    );
  }
}
