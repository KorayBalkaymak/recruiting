import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local", override: false });

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL fehlt. Im Terminal setzen (gewinnt gegenüber .env.local) oder in .env.local eintragen."
  );
}

let host = "unknown";
let database = "unknown";
try {
  const parsed = new URL(databaseUrl.replace(/^postgres(ql)?:/i, "http:"));
  host = parsed.hostname || "unknown";
  database = parsed.pathname.replace(/^\//, "").split("/")[0] || "unknown";
} catch {
  throw new Error("DATABASE_URL ist gesetzt, aber kein gültiger Postgres-URI.");
}

console.info(`[drizzle] target host=${host} db=${database}`);

export default defineConfig({
  schema: "./lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
