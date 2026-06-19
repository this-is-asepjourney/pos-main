import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { uploadFileToGCS } from "@/lib/gcs";

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

    // Upload to GCS
    const publicUrl = await uploadFileToGCS(
      buffer,
      file.name,
      file.type,
      folder
    );

    return NextResponse.json({ url: publicUrl }, { status: 201 });
  } catch (error: any) {
    console.error("Upload to GCS error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengunggah file." },
      { status: 500 }
    );
  }
}
