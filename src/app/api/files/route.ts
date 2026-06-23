import { NextResponse } from "next/server";
import { minioClient } from "@/lib/minio";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return new NextResponse("Missing 'path' parameter", { status: 400 });
    }

    const bucketName = process.env.MINIO_BUCKET_NAME || "pos-bucket";

    // Stream file directly from MinIO (server-side), no redirect to MinIO port
    const stream: NodeJS.ReadableStream = await new Promise((resolve, reject) => {
      minioClient.getObject(bucketName, path, (err, dataStream) => {
        if (err) return reject(err);
        resolve(dataStream);
      });
    });

    // Detect content type from extension
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    const contentTypeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      pdf: "application/pdf",
    };
    const contentType = contentTypeMap[ext] ?? "application/octet-stream";

    // Collect stream into buffer and return
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // cache 1 day
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Failed to proxy file from MinIO:", error);
    return new NextResponse("Not Found", { status: 404 });
  }
}
