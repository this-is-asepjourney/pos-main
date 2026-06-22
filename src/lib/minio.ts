import * as Minio from "minio";

const getMinioClient = () => {
  return new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || "127.0.0.1",
    port: process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT, 10) : 9000,
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY || "",
    secretKey: process.env.MINIO_SECRET_KEY || "",
  });
};

export const minioClient = getMinioClient();

/**
 * Mengunggah file buffer ke MinIO dan mengembalikan proxy path.
 *
 * @param buffer Buffer dari file yang diupload
 * @param originalFilename Nama asli file
 * @param mimeType Mime type file (contoh: image/jpeg)
 * @param folder Nama folder di bucket (contoh: "products" atau "payments")
 * @returns Proxy URL (misalnya /api/files?path=...)
 */
export async function uploadFileToMinio(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string,
  folder: string = "uploads"
): Promise<string> {
  const bucketName = process.env.MINIO_BUCKET_NAME || "pos-bucket";

  // Memastikan bucket ada, jika tidak, bisa dibuat (opsional)
  // Untuk keamanan, diasumsikan bucket sudah ada.

  const ext = originalFilename.split(".").pop();
  const timestamp = new Date().getTime();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const newFilename = `${folder}/${timestamp}-${randomStr}.${ext}`;

  await minioClient.putObject(bucketName, newFilename, buffer, buffer.length, {
    "Content-Type": mimeType,
  });

  return `/api/files?path=${encodeURIComponent(newFilename)}`;
}

/**
 * Membuat presigned URL (berlaku sementara) untuk file di MinIO.
 * 
 * @param objectName Nama objek di MinIO (contoh: "uploads/123-abc.jpg")
 * @param expiry Waktu kedaluwarsa dalam detik (default 1 jam)
 * @returns Presigned URL string
 */
export async function getSignedUrlForFile(
  objectName: string,
  expiry: number = 3600
): Promise<string> {
  const bucketName = process.env.MINIO_BUCKET_NAME || "pos-bucket";
  return await minioClient.presignedGetObject(bucketName, objectName, expiry);
}
