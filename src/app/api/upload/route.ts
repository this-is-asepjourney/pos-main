import { NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "File gambar tidak ditemukan dalam request." },
        { status: 400 }
      );
    }

    // Read Silo S3 configuration from environment
    const endpoint =
      process.env.SILO_ENDPOINT ||
      process.env.MINIO_ENDPOINT ||
      "http://192.168.25.101:9000";
    const accessKeyId =
      process.env.SILO_ACCESS_KEY ||
      process.env.MINIO_ROOT_USER ||
      "admin";
    const secretAccessKey =
      process.env.SILO_SECRET_KEY ||
      process.env.MINIO_ROOT_PASSWORD ||
      "admin12345";
    const bucket =
      process.env.SILO_BUCKET ||
      process.env.MINIO_BUCKET ||
      "homelab-storage";
    const publicBaseUrl =
      process.env.SILO_PUBLIC_URL ||
      `${endpoint.replace(/\/+$/, "")}/${bucket}`;

    const s3 = new S3Client({
      endpoint,
      region: "us-east-1", // MinIO standard default
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Required for self-hosted Silo/MinIO
    });

    // Ensure bucket exists
    try {
      await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      try {
        await s3.send(new CreateBucketCommand({ Bucket: bucket }));
      } catch (bucketErr) {
        console.warn("[Silo S3] Head/Create bucket note:", bucketErr);
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = file.name.split(".").pop() || "png";
    const safeBaseName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 30);
    const key = `pos-products/${Date.now()}-${safeBaseName}.${extension}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type || "image/png",
      })
    );

    const publicUrl = `${publicBaseUrl.replace(/\/+$/, "")}/${key.replace(/^pos-products\//, "")}`.includes(bucket)
      ? `${endpoint.replace(/\/+$/, "")}/${bucket}/${key}`
      : `${publicBaseUrl.replace(/\/+$/, "")}/${key}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      key,
    });
  } catch (error) {
    console.error("[Silo Upload API] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengupload file ke penyimpanan Silo.",
      },
      { status: 500 }
    );
  }
}

