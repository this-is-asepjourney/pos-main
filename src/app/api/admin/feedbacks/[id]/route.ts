import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { status } = await req.json();
    const conn = pool;
    await conn.execute("UPDATE user_feedbacks SET status = ? WHERE id = ?", [status, params.id]);
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
