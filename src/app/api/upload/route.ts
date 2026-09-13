import { NextRequest, NextResponse } from "next/server";
import { uploadTrackedFile, StorageQuotaExceededError } from "@/lib/storage/tracked-upload";
import { getSessionFromCookies } from "@/lib/auth/cookies";

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file received." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadTrackedFile(session.nutritionistId, buffer, {
      fileName: file.name,
      folder: "uploads",
      purpose: "general",
      uploadedByUserId: session.userId,
    });

    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof StorageQuotaExceededError) {
      return NextResponse.json({ error: error.message }, { status: 413 });
    }
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file." }, { status: 500 });
  }
}
