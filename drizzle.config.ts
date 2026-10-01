import { defineConfig } from "drizzle-kit";

// drizzle-kit doesn't read .env on its own; on the server the variables come
// from docker compose instead, so a missing file is fine.
try {
  process.loadEnvFile();
} catch {}

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
