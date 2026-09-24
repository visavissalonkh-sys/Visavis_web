import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getMasterForSession } from "@/lib/master";
import { signCloudinaryParams } from "@/lib/cloudinary";
import { rateLimit } from "@/lib/rate-limit";
import { isTrustedOrigin } from "@/lib/csrf";
import { requireEnv } from "@/lib/env";

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  const session = await getSession();
  if (!session || session.role !== "master") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const master = await getMasterForSession(session);
  if (!master) return NextResponse.json({ error: "not_a_master" }, { status: 403 });

  const limit = await rateLimit(`master:avatar:sign:${master.id}`, 10, 300);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `visavis/masters/${master.id}`;
  const signature = signCloudinaryParams({ timestamp, folder });

  return NextResponse.json({
    timestamp,
    folder,
    signature,
    apiKey: requireEnv("CLOUDINARY_API_KEY"),
    cloudName: requireEnv("CLOUDINARY_CLOUD_NAME"),
  });
}
