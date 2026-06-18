import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const conn = pool;
    const [rows] = await conn.execute(
      `SELECT n.*, t.name as tenant_name 
       FROM admin_notifications n 
       LEFT JOIN tenants t ON n.target_tenant_id = t.id 
       ORDER BY n.created_at DESC`
    );
    
    return NextResponse.json({ notifications: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { title, message, type, target_tenant_id } = await req.json();
    const conn = pool;
    await conn.execute(
      "INSERT INTO admin_notifications (title, message, type, target_tenant_id) VALUES (?, ?, ?, ?)",
      [title, message, type || 'info', target_tenant_id || null]
    );
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
