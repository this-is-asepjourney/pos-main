const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const uploadFolder = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER;

export const isCloudinaryConfigured = Boolean(cloudName && uploadPreset);

export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  if (!isCloudinaryConfigured) {
    throw new Error(
      "Cloudinary belum dikonfigurasi. Isi NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME dan NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.",
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset as string);
  if (uploadFolder) {
    formData.append("folder", uploadFolder);
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error("Upload gambar ke Cloudinary gagal.");
  }

  const payload = (await response.json()) as { secure_url?: string };
  if (!payload.secure_url) {
    throw new Error("Cloudinary tidak mengembalikan URL gambar.");
  }

  return payload.secure_url;
};
