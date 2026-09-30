/**
 * Public pages must not 500 because Postgres blinked.
 *
 * The root layout reads locations for the header, footer and LocalBusiness
 * JSON-LD. Before this, an unreachable database there took down *every*
 * route in the app — including ones that need no database at all — because
 * a throw in the root layout has nowhere left to bubble to. Booking, auth,
 * account, master and admin paths deliberately do NOT use this: there,
 * failing loudly is correct, because silently showing an empty schedule or
 * an empty booking list is worse than an error page.
 */
export async function safeQuery<T>(label: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const message = error instanceof Error ? error.message.split("\n")[0] : String(error);
    console.error(`[safe-query] ${label} failed, rendering fallback — ${message}`);
    return fallback;
  }
}
