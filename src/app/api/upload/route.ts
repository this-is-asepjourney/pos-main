import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { uploadFileToMinio } from "@/lib/minio";
import pool from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Validate file size (max 5MB)
    if (buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran file terlalu besar (Maksimal 5MB)" }, { status: 400 });
    }

    // Upload to MinIO
    const uploadResult = await uploadFileToMinio(
      buffer,
      file.name,
      file.type,
      folder,
      session.tenantId
    );

    const fileId = uuidv4();
    const conn = pool;
    await conn.execute(
      `INSERT INTO files 
       (id, tenant_id, folder, original_filename, file_path, mime_type, size, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fileId,
        session.tenantId || null,
        folder,
        file.name,
        uploadResult.minioPath,
        file.type,
        buffer.length,
        session.uid || null
      ]
    );

    return NextResponse.json({ url: uploadResult.url }, { status: 201 });
  } catch (error: any) {
    console.error("Upload to MinIO error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengunggah file." },
      { status: 500 }
    );
  }
}
