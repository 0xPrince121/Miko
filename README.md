# Miko 💙

A clean, modern and professional **Discord ticket bot** with a tiny premium web dashboard.

- **Discord bot** — Node.js + TypeScript + discord.js
- **Dashboard** — Next.js + TypeScript + Tailwind CSS
- **Database** — SQLite (Node built-in `node:sqlite`, no native modules)

Primary brand color: **#0057E7**

---

## Features

| Tickets | Panel | Dashboard |
| --- | --- | --- |
| Create / Close / Reopen | Configurable title, description, emoji | Overview (open / closed / total / activity) |
| Claim / Unclaim | Editable button name + emoji | Ticket Setup (category, role, channels) |
| Add / Remove users | Live preview | Ticket Panel editor + deploy |
| Rename / Delete | Ticket categories as buttons | Tickets history table |
| HTML transcripts | Multiple ticket types | Settings (limits, auto-close, DM, staff) |
| Full audit logs | | Discord OAuth2 login |

---

## Requirements

- Node.js **22.5+** (uses the built-in `node:sqlite`; tested on Node 24/26)
- A Discord application with **Bot** + **OAuth2** enabled

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure
cp .env.example .env
#   -> fill in DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET
#   -> set sensible SESSION_SECRET and BOT_API_KEY

# 3. Build
npm run build

# 4. Run (two processes)
npm run start:bot        # terminal 1  (HTTP API on :3001 + Discord)
npm run start:dashboard  # terminal 2  (http://localhost:3000)
```

For development with hot reload:

```bash
npm run dev:bot
npm run dev:dashboard
```

> The bot and the dashboard share **one** `.env` at the repository root and one SQLite database
> (`data/miko.db`, controlled by `DATABASE_URL`).

## Discord application setup

1. Go to <https://discord.com/developers/applications> → **New Application** → name it **Miko**.
2. **Bot** page → **Reset Token** → copy into `DISCORD_TOKEN`. Toggle on these privileged intents:
   - `Server Members Intent`
   - `Message Content Intent`
3. **OAuth2 → General**: add `http://localhost:3000/api/auth/callback/discord` to *Redirects*.
4. Copy the **Client ID** → `DISCORD_CLIENT_ID` and **Client Secret** (OAuth2 → General) → `DISCORD_CLIENT_SECRET`.
5. The dashboard builds the **Invite link** for you automatically (Miko joins with the exact permissions it needs).

## Start-to-finish flow

1. **Login** — open http://localhost:3000 → *Login with Discord*.
2. **Select server** — pick one of your servers; click **Invite Miko** if it isn't there yet.
3. **Ticket Setup** → choose a **Ticket Category**, **Support Role**, **Log Channel**, **Transcript Channel** and **Panel Channel** → Save.
4. **Ticket Panel** → tweak title/description/emoji/button, watch the **live preview**, manage **Ticket Types**, then **Save**.
5. **Deploy** → press *Deploy Panel* (dashboards talks to the bot's internal API `:3001`). Miko posts the panel embed in the chosen channel.
6. **Create** → a user clicks the button → Miko creates a private `#ticket-1-…` channel. Only the creator, staff and Miko can see/send in it.
7. **Claim** → staff clicks **Claim 🎫** → panel updates to *Claimed by @Staff*, log is posted.
8. **Handle** → staff can add/remove users, rename, or export a transcript at any time.
9. **Close** → staff clicks **Close** → confirmation → optional reason → Miko locks the channel, generates an HTML transcript, sends it to the transcript channel, optionally DMs the creator, logs the event and moves the channel to the closed category (or deletes it if configured).
10. **Reopen** → click **Reopen** — channel unlocks and moves back.
11. **History** — the dashboard **Tickets** page reflects every step (status, claimed staff, open/close times).

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DISCORD_TOKEN` | Bot token |
| `DISCORD_CLIENT_ID` | Application client ID (bot identity + OAuth2) |
| `DISCORD_CLIENT_SECRET` | OAuth2 client secret |
| `DASHBOARD_URL` | Public/base dashboard URL (used for the OAuth2 redirect) |
| `DISCORD_REDIRECT_URI` | Exact OAuth2 redirect URI (default `http://localhost:3000/api/auth/callback/discord`) |
| `SESSION_SECRET` | Signs dashboard session cookies (long random string) |
| `BOT_API_KEY` | Secret shared between the dashboard and bot API |
| `BOT_API_URL` | Where the dashboard reaches the bot's internal API (default `http://localhost:3001`) |
| `BOT_API_PORT` | Port the bot API listens on (default `3001`) |
| `DATABASE_URL` | SQLite path, e.g. `file:data/miko.db` |

No channel IDs, role IDs or guild IDs are hardcoded — everything is configured per-server from the dashboard and stored in the database. All permissions are enforced server-side.

## Project layout

```
packages/db    shared SQLite layer (config, ticket types, tickets, users)
bot            discord.js bot + Express micro-API
dashboard      Next.js dashboard (OAuth2, server-side guards, API routes)
data/          SQLite database (created at runtime, git-ignored)
```

## Commands

```bash
npm run typecheck       # typecheck all workspaces
npm run build           # build db -> bot -> dashboard
npm run dev:bot         # bot with tsx watch
npm run dev:dashboard   # dashboard with Next dev
npm run start:bot       # run compiled bot
npm run start:dashboard # run compiled dashboard
node scripts/smoke.js   # offline test of db + transcript logic
```