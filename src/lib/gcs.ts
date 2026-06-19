import { Storage } from "@google-cloud/storage";

const getStorageClient = () => {
  // If we have explicit credentials via env variables
  if (process.env.GCS_PROJECT_ID && process.env.GCS_CLIENT_EMAIL && process.env.GCS_PRIVATE_KEY) {
    return new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials: {
        client_email: process.env.GCS_CLIENT_EMAIL,
        // Ensure private key handles newlines correctly
        private_key: process.env.GCS_PRIVATE_KEY.split(String.raw`\n`).join("\n").replace(/\\n/g, "\n"),
      },
    });
  }
  // Otherwise, default to Application Default Credentials (e.g. GOOGLE_APPLICATION_CREDENTIALS)
  return new Storage();
};

const storage = getStorageClient();

/**
 * Mengunggah file buffer ke Google Cloud Storage dan mengembalikan public URL.
 * Pastikan bucket Anda diset "Fine-grained" atau "Uniform" access dengan 
 * "allUsers" memiliki role "Storage Object Viewer" agar URL dapat diakses publik.
 *
 * @param buffer Buffer dari file yang diupload
 * @param originalFilename Nama asli file
 * @param mimeType Mime type file (contoh: image/jpeg)
 * @param folder Nama folder di GCS (contoh: "products" atau "payments")
 * @returns Public URL dari GCS
 */
export async function uploadFileToGCS(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string,
  folder: string = "uploads"
): Promise<string> {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("GCS_BUCKET_NAME environment variable is not defined.");
  }

  const bucket = storage.bucket(bucketName);
  const ext = originalFilename.split(".").pop();
  const timestamp = new Date().getTime();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const newFilename = `${folder}/${timestamp}-${randomStr}.${ext}`;

  const file = bucket.file(newFilename);

  await file.save(buffer, {
    metadata: {
      contentType: mimeType,
      cacheControl: "public, max-age=31536000",
    },
    resumable: false, // For small files, disabled for speed
  });

  return `https://storage.googleapis.com/${bucketName}/${newFilename}`;
}
