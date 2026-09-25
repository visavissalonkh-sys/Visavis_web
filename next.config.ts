import type { NextConfig } from "next";
import path from "node:path";

// Pin the server process to UTC. Booking/schedule dates are stored as
// UTC-midnight (Prisma `@db.Date`), and several date-fns calls (addDays,
// startOfWeek, endOfWeek) read/write dates through the *local* timezone —
// on a server not already running in UTC, that silently shifts week/day
// boundaries by the local offset. Real-world wall-clock conversions still
// go through date-fns-tz with an explicit "Europe/Kyiv" argument elsewhere
// and are unaffected by this.
process.env.TZ = "UTC";

const nextConfig: NextConfig = {
  // Don't hand a probing attacker a free "this is Next.js" signal.
  poweredByHeader: false,
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
