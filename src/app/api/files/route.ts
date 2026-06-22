import { NextResponse } from "next/server";
import { getSignedUrlForFile } from "@/lib/minio";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return new NextResponse("Missing 'path' parameter", { status: 400 });
    }

    // You might want to add session/auth check here if you want to restrict
    // access to logged-in users. E.g.:
    // const session = await getSession();
    // if (!session) return new NextResponse("Unauthorized", { status: 401 });

    // Generate a presigned URL valid for 1 hour (3600 seconds)
    const signedUrl = await getSignedUrlForFile(path, 3600);

    // Redirect the client to the presigned MinIO URL
    return NextResponse.redirect(signedUrl, { status: 302 });
  } catch (error: any) {
    console.error("Failed to generate signed URL:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
