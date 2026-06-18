import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

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
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      const uploadDir = join(process.cwd(), "public", "uploads");
      
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      
      const path = join(uploadDir, filename);
      await writeFile(path, buffer);
      qrImageUrl = `/uploads/${filename}`;
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
