import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const createReviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().max(1000).optional(),
});

export class BookingOwnershipError extends Error {}
export class BookingNotCompletedError extends Error {}
export class ReviewAlreadyExistsError extends Error {}

/**
 * `masterId`/`locationId` are deliberately NOT taken from the request body —
 * they're derived from the booking itself, so a client can never write a
 * review attributed to a different master than the one they actually saw.
 */
export async function createReview(
  clientId: string,
  input: { bookingId: string; rating: number; text?: string },
) {
  const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking || booking.clientId !== clientId) throw new BookingOwnershipError();
  if (booking.status !== "completed") throw new BookingNotCompletedError();

  const existing = await prisma.review.findUnique({ where: { bookingId: input.bookingId } });
  if (existing) throw new ReviewAlreadyExistsError();

  try {
    return await prisma.review.create({
      data: {
        clientId,
        masterId: booking.masterId,
        locationId: booking.locationId,
        bookingId: booking.id,
        rating: input.rating,
        text: input.text ?? "",
      },
    });
  } catch (error) {
    // Race: two concurrent requests both passed the check above — the
    // unique constraint on bookingId is the real guarantee, this is just a
    // friendlier error than a raw 500.
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      throw new ReviewAlreadyExistsError();
    }
    throw error;
  }
}

export async function getPublishedReviews({
  masterId,
  locationId,
}: {
  masterId?: string;
  locationId?: string;
}) {
  if (!masterId && !locationId) return [];

  const reviews = await prisma.review.findMany({
    where: {
      isPublished: true,
      ...(masterId ? { masterId } : {}),
      ...(locationId ? { locationId } : {}),
    },
    include: { client: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    text: r.text,
    authorName: r.client.name ?? "Клієнтка",
    createdAt: r.createdAt.toISOString(),
  }));
}
