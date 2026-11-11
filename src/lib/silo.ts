export const isSiloConfigured = true;

/**
 * Upload an image file to Silo (MinIO / S3 compatible) through the server-side API route.
 * This keeps S3 credentials protected on the server side.
 */
export const uploadImageToSilo = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.error || "Gagal mengupload gambar ke Silo storage."
    );
  }

  const payload = (await response.json()) as { url?: string; success?: boolean };
  if (!payload.url) {
    throw new Error("Silo tidak mengembalikan URL gambar.");
  }

  return payload.url;
};

