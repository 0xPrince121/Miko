import express from "express";
import { optional } from "@miko/db";
import { client } from "../client";
import { deployPanel, removePanel } from "../panel";

function authorize(req: express.Request): boolean {
  const configured = optional("BOT_API_KEY");
  if (!configured) return false;
  const header = req.headers.authorization ?? "";
  return header === `Bearer ${configured}`;
}

export function startApiServer(): void {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, uptime: process.uptime() });
  });

  app.post("/panel/deploy", async (req, res) => {
    if (!authorize(req)) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }
    const guildId = String(req.body?.guildId ?? "");
    if (!guildId) {
      res.status(400).json({ ok: false, error: "guildId is required" });
      return;
    }
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      res.status(404).json({ ok: false, error: "Bot is not in that server." });
      return;
    }
    try {
      const result = await deployPanel(guild);
      res.json(result);
    } catch (err) {
      console.error("[miko] panel deploy error:", err);
      res.status(500).json({ ok: false, error: "Failed to deploy panel." });
    }
  });

  app.post("/panel/remove", async (req, res) => {
    if (!authorize(req)) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }
    const guildId = String(req.body?.guildId ?? "");
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      res.status(404).json({ ok: false, error: "Bot is not in that server." });
      return;
    }
    try {
      const result = await removePanel(guild);
      res.json(result);
    } catch {
      res.status(500).json({ ok: false, error: "Failed to remove panel." });
    }
  });

  const port = parseInt(optional("BOT_API_PORT", "3001"), 10);
  app.listen(port, () => {
    console.log(`[miko] API listening on http://localhost:${port}`);
  });
}