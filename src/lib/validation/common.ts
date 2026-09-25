const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Every dynamic API route takes an :id straight from the URL and passes it
 * to Prisma. A malformed value (not just a wrong-but-valid UUID) makes
 * Prisma's query engine throw PrismaClientKnownRequestError P2023 — an
 * uncaught exception that surfaces as a bare 500 instead of a clean 400.
 * Call this before any Prisma call that takes a route-param id.
 */
export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}
