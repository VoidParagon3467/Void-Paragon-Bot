# Void Paragon Bot - Railway Deployment Guide

## Quick Deploy (2 minutes)

### Step 1: Create GitHub Repo
```bash
git remote add origin https://github.com/YOUR_USERNAME/void-paragon-bot.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Railway
1. Go to **railway.app** → Sign in
2. Click **New Project** → **Deploy from GitHub**
3. Connect GitHub & select this repository
4. Railway auto-detects Node.js, click **Deploy**

### Step 3: Add Environment Variables
In Railway dashboard, go to **Variables** tab and add:
- `DISCORD_TOKEN` = Your Discord bot token
- `DATABASE_URL` = Railway Postgres connection string (auto-created)
- `SESSION_SECRET` = Any random string (e.g., `supersecret123`)
- `NODE_ENV` = `production`

### Step 4: Done!
Your bot runs 24/7 for free. Watch logs in Railway dashboard.

## Getting Discord Token
1. Go to https://discord.com/developers/applications
2. Click "New Application" → name it "Void Paragon Bot"
3. Go to "Bot" tab → Click "Add Bot"
4. Copy the token under "TOKEN"
5. Enable "Message Content Intent" in Privileged Gateway Intents
6. Go to OAuth2 → URL Generator → select scopes: `bot` and permissions: `applications.commands`, `send_messages`, `manage_messages`, `embed_links`
7. Copy generated URL, open in browser, select your server, authorize

Done! Your bot is ready to invite and run.
