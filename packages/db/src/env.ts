import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { repoRoot } from "./path";

/**
 * Loads the root `.env` file into process.env. Safe to call multiple times.
 * Call this before anything touches the database.
 */
export function loadEnv(): void {
  const root = repoRoot();
  process.env.MIKO_ROOT = root;
  const envPath = path.join(root, ".env");
  if (envPath && fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

/** Reads a required env variable or throws. */
export function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}