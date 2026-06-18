import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const sessionToken = (await cookies()).get("session")?.value;
    if (!sessionToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    // Simplification: In a real app we decrypt session to get tenantId. 
    // Here we'll expect the client to pass tenantId in headers or just fetch all for now, 
    // but actually let's get it from headers since it's a GET request.
    return NextResponse.json({ error: "Use POST to send tenantId or pass via headers" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId } = await req.json();
    if (!tenantId) return NextResponse.json({ error: "tenantId is required" }, { status: 400 });

    const conn = pool;
    const [rows] = await conn.execute(
      "SELECT * FROM admin_notifications WHERE target_tenant_id IS NULL OR target_tenant_id = ? ORDER BY created_at DESC LIMIT 20",
      [tenantId]
    );
    
    return NextResponse.json({ notifications: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
