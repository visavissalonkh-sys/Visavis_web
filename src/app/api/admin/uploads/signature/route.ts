import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, NotAdminError } from "@/lib/admin";
import { signCloudinaryParams } from "@/lib/cloudinary";
import { rateLimit } from "@/lib/rate-limit";
import { isTrustedOrigin } from "@/lib/csrf";
import { requireEnv } from "@/lib/env";
import { adminUploadSignatureSchema } from "@/lib/validation/admin";

/** Generic signed-upload endpoint for the admin panel's multi-photo fields
 * (services, locations) — `purpose` picks the Cloudinary folder server-side
 * so the client can't upload into an arbitrary one. */
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

  const limit = await rateLimit(`admin:uploads:sign:${admin.adminId}`, 30, 300);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = adminUploadSignatureSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: "Невірне призначення завантаження" }, { status: 400 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `visavis/${parsed.data.purpose}s/uploads`;
  const signature = signCloudinaryParams({ timestamp, folder });

  return NextResponse.json({
    timestamp,
    folder,
    signature,
    apiKey: requireEnv("CLOUDINARY_API_KEY"),
    cloudName: requireEnv("CLOUDINARY_CLOUD_NAME"),
  });
}
