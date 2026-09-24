import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import {
  createReview,
  createReviewSchema,
  getPublishedReviews,
  BookingNotCompletedError,
  BookingOwnershipError,
  ReviewAlreadyExistsError,
} from "@/lib/reviews";
import { isTrustedOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const masterId = searchParams.get("masterId") ?? undefined;
  const locationId = searchParams.get("locationId") ?? undefined;

  const reviews = await getPublishedReviews({ masterId, locationId });
  return NextResponse.json({ reviews });
}

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  const session = await getSession();
  if (!session || session.role !== "client") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const limit = await rateLimit(`reviews:create:${session.sub}`, 10, 3600);
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited", message: "Забагато відгуків. Спробуйте пізніше." }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createReviewSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Невірні дані" },
      { status: 400 },
    );
  }

  try {
    const review = await createReview(session.sub, parsed.data);
    return NextResponse.json({ success: true, id: review.id });
  } catch (error) {
    if (error instanceof BookingOwnershipError) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (error instanceof BookingNotCompletedError) {
      return NextResponse.json(
        { error: "not_completed", message: "Відгук можна залишити лише на завершений візит." },
        { status: 400 },
      );
    }
    if (error instanceof ReviewAlreadyExistsError) {
      return NextResponse.json(
        { error: "already_reviewed", message: "Ви вже залишили відгук на цей запис." },
        { status: 409 },
      );
    }
    throw error;
  }
}
