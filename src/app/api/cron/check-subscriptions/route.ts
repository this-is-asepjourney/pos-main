import { NextResponse } from "next/server";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export async function GET(request: Request) {
  // Verifikasi (opsional): Anda bisa tambahkan validasi token cron di header
  // const authHeader = request.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return new Response('Unauthorized', { status: 401 });

  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Cari langganan yang aktif, current_period_end <= 3 hari ke depan, dan belum dikirim peringatan
      const [rows] = await conn.query<RowDataPacket[]>(`
        SELECT s.tenant_id, s.current_period_end, t.name as tenant_name
        FROM subscriptions s
        JOIN tenants t ON s.tenant_id = t.id
        WHERE s.status = 'active'
          AND s.current_period_end IS NOT NULL
          AND s.current_period_end <= DATE_ADD(NOW(), INTERVAL 3 DAY)
          AND s.current_period_end > NOW()
          AND s.warning_sent_at IS NULL
      `);

      let sentCount = 0;
      for (const row of rows) {
        // Kirim notifikasi
        const dateStr = new Date(row.current_period_end).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        await conn.query(
          "INSERT INTO admin_notifications (id, target_tenant_id, type, title, message) VALUES (UUID(), ?, 'warning', 'Masa Tenggat Langganan', ?)",
          [row.tenant_id, `Langganan Anda akan berakhir pada ${dateStr}. Mohon segera perpanjang langganan Anda untuk menghindari gangguan layanan.`]
        );

        // Update flag warning
        await conn.query(
          "UPDATE subscriptions SET warning_sent_at = NOW() WHERE tenant_id = ?",
          [row.tenant_id]
        );
        sentCount++;
      }

      await conn.commit();
      return NextResponse.json({ success: true, message: `Berhasil mengirim ${sentCount} peringatan masa tenggat.` });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Cron Check Subscriptions Error:", error);
    return NextResponse.json({ error: "Gagal memproses pengecekan masa tenggat." }, { status: 500 });
  }
}
