import { defineConfig } from "drizzle-kit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const currentDir = typeof __dirname !== "undefined"
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));

// Auto-load root .env or local .env if DATABASE_URL is not already set in environment
if (!process.env.DATABASE_URL) {
  const rootEnv = path.resolve(currentDir, "../../.env");
  const localEnv = path.resolve(currentDir, ".env");

  if (fs.existsSync(rootEnv)) {
    process.loadEnvFile(rootEnv);
  } else if (fs.existsSync(localEnv)) {
    process.loadEnvFile(localEnv);
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined. Ensure it is set in your root .env file.");
}

export default defineConfig({
  schema: "./src/schema/*.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
