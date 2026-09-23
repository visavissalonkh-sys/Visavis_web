import { defineConfig } from "prisma/config";

// A prisma.config.ts file opts out of the Prisma CLI's old implicit .env
// loading, so local `npx prisma ...` commands need it loaded explicitly.
// Railway itself injects real env vars directly, so this is a no-op there.
try {
  process.loadEnvFile(".env");
} catch {
  // no local .env file — fine in CI/production
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
