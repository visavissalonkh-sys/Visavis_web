/**
 * Structured auth/security event log — printed as JSON lines to stdout, where
 * Railway's log collector picks it up. Never log the OTP code itself, only
 * that an attempt happened.
 */
export function logAuthEvent(event: {
  action: string;
  ip: string;
  phone: string;
  [key: string]: unknown;
}) {
  console.info(
    JSON.stringify({
      type: "auth_event",
      timestamp: new Date().toISOString(),
      ...event,
    }),
  );
}
