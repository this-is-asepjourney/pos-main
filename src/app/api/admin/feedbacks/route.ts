import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const conn = pool;
    const [rows] = await conn.execute(
      `SELECT f.*, t.name as tenant_name, u.name as user_name, u.email as user_email
       FROM user_feedbacks f 
       JOIN tenants t ON f.tenant_id = t.id 
       JOIN users u ON f.user_id = u.id
       ORDER BY f.created_at DESC`
    );
    
    return NextResponse.json({ feedbacks: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
