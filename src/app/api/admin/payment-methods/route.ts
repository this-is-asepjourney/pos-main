import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { uploadFileToMinio } from "@/lib/minio";

export async function GET() {
  try {
    const conn = pool;
    const [rows] = await conn.execute("SELECT * FROM admin_payment_methods ORDER BY created_at DESC");
    
    return NextResponse.json({ methods: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const type = formData.get("type") as string;
    const accountNumber = formData.get("accountNumber") as string;
    const accountName = formData.get("accountName") as string;
    const file = formData.get("qrImage") as File | null;
    const isActive = formData.get("isActive") === "true";

    let qrImageUrl = "";
    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadResult = await uploadFileToMinio(buffer, file.name, file.type, "payments");
      qrImageUrl = uploadResult.url;
    }

    const conn = pool;
    await conn.execute(
      "INSERT INTO admin_payment_methods (name, type, account_number, account_name, qr_image_url, is_active) VALUES (?, ?, ?, ?, ?, ?)",
      [name, type, accountNumber || null, accountName || null, qrImageUrl || null, isActive ? 1 : 0]
    );
    

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
