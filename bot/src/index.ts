import { loadEnv } from "@miko/db";

loadEnv();

import { startBot } from "./client";
import { startApiServer } from "./api/server";

async function main(): Promise<void> {
  await startBot();
  startApiServer();
}

main().catch((err) => {
  console.error("[miko] failed to start:", err);
  process.exit(1);
});