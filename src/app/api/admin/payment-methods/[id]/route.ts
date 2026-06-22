import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const conn = pool;
    await conn.execute("DELETE FROM admin_payment_methods WHERE id = ?", [id]);
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { is_active } = await req.json();
    const conn = pool;
    await conn.execute("UPDATE admin_payment_methods SET is_active = ? WHERE id = ?", [is_active ? 1 : 0, id]);
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
