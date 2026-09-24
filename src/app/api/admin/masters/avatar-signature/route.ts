import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, NotAdminError } from "@/lib/admin";
import { signCloudinaryParams } from "@/lib/cloudinary";
import { rateLimit } from "@/lib/rate-limit";
import { isTrustedOrigin } from "@/lib/csrf";
import { requireEnv } from "@/lib/env";

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof NotAdminError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw error;
  }

  const limit = await rateLimit(`admin:avatar:sign:${admin.adminId}`, 20, 300);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  // Not keyed by masterId — this signs uploads for both "edit an existing
  // master" and "create a new one" (which has no id yet at upload time).
  const folder = "visavis/masters/admin-upload";
  const signature = signCloudinaryParams({ timestamp, folder });

  return NextResponse.json({
    timestamp,
    folder,
    signature,
    apiKey: requireEnv("CLOUDINARY_API_KEY"),
    cloudName: requireEnv("CLOUDINARY_CLOUD_NAME"),
  });
}
