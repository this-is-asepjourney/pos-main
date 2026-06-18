import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { tenantId, userId, subject, message } = await req.json();
    if (!tenantId || !userId || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const conn = pool;
    await conn.execute(
      "INSERT INTO user_feedbacks (tenant_id, user_id, subject, message) VALUES (?, ?, ?, ?)",
      [tenantId, userId, subject, message]
    );
    
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
