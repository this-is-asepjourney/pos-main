import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const conn = pool;
    await conn.execute("DELETE FROM admin_payment_methods WHERE id = ?", [params.id]);
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { is_active } = await req.json();
    const conn = pool;
    await conn.execute("UPDATE admin_payment_methods SET is_active = ? WHERE id = ?", [is_active ? 1 : 0, params.id]);
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
