import path from "node:path";

let cached: string | null = null;

/**
 * Absolute path to the repository root (the folder containing `.env`).
 * Can be overridden with the MIKO_ROOT environment variable.
 */
export function repoRoot(): string {
  if (cached) return cached;
  if (process.env.MIKO_ROOT) {
    cached = process.env.MIKO_ROOT;
    return cached;
  }
  // packages/db/{src|dist} -> ../../../ lands on the repo root
  cached = path.resolve(__dirname, "../../../");
  return cached;
}