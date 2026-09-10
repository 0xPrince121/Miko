import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

function resolveRoot(): string {
  if (process.env.MIKO_ROOT) return process.env.MIKO_ROOT;
  // When running inside the dashboard workspace, cwd is the dashboard folder.
  const cwd = process.cwd();
  const dashboardDir = path.resolve(cwd);
  const root = path.resolve(dashboardDir, "..");
  if (fs.existsSync(path.join(root, ".env")) || fs.existsSync(path.join(root, "package.json"))) {
    return root;
  }
  return root;
}

export function ensureEnv(): void {
  if (process.env.MIKO_ENV_LOADED) return;
  const root = resolveRoot();
  process.env.MIKO_ROOT = root;
  const envPath = path.join(root, ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
  process.env.MIKO_ENV_LOADED = "1";
}

export function getEnv(name: string, fallback = ""): string {
  ensureEnv();
  return process.env[name] ?? fallback;
}

export function requireEnv(name: string): string {
  ensureEnv();
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name} (copy .env.example to .env)`);
  return value;
}