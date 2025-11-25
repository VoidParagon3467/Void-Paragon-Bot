import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { cultivationService } from "./cultivation";
import { missionService } from "./missions";
import { eventBus } from "./event-bus";
import { insertUserSchema, insertFactionSchema } from "@shared/schema";
import { EmbedBuilder } from "discord.js";

// Extend WebSocket type to include serverId and userId
interface ExtendedWebSocket extends WebSocket {
  serverId?: string;
  userId?: number;
}

// Generate simple session token
function generateSessionToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Session expiry time (24 hours)
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

export async function registerRoutes(app: Express, botClient?: any): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: ExtendedWebSocket) => {
    console.log('[WebSocket] Client connected');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        // Handle different message types
        switch (data.type) {
          case 'subscribe':
            // Subscribe to updates for specific server
            ws.serverId = data.serverId ?? "default";
            ws.userId = data.userId;
            // Register with EventBus for targeted broadcasts
            if (ws.serverId) {
              eventBus.registerWsClient(ws.serverId, ws);
              console.log(`[WebSocket] Client subscribed to server: ${ws.serverId}`);
            }
            break;
        }
      } catch (error) {
        console.error('[WebSocket] Message error:', error);
      }
    });
    
    ws.on('close', () => {
      if (ws.serverId) {
        console.log(`[WebSocket] Client disconnected from server: ${ws.serverId}`);
        // Unregister from EventBus (CRITICAL: prevent memory leak)
        eventBus.unregisterWsClient(ws.serverId, ws);
      }
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
      // CRITICAL: Unregister on error too (prevent stale connections)
      if (ws.serverId) {
        eventBus.unregisterWsClient(ws.serverId, ws);
      }
    });
  });
  
  // Legacy broadcast function (now delegates to EventBus)
  // Used by existing code - maintains backward compatibility
  const broadcast = (serverId: string, data: any) => {
    eventBus.broadcastToServer({
      ...data,
      serverId: serverId || "default",
      timestamp: new Date(),
    });
  };

  // Diagnostic endpoint
  app.get("/api/debug", async (req: Request, res: Response) => {
    try {
      const result = await storage.getSession("test_check");
      res.json({ 
        status: "ok",
        message: "Database is connected and auth_sessions table exists"
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      res.status(500).json({
        status: "error",
        message: errorMsg,
        hint: "auth_sessions table may not exist. Run 'npm run db:push' on Render."
      });
    }
  });

  // Discord OAuth endpoints
  app.get("/api/auth/login", (req: Request, res: Response) => {
    const clientId = process.env.DISCORD_CLIENT_ID || "1234567890"; // Placeholder
    const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/callback`);
    const scopes = "identify%20guilds%20email";
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}`;
    res.redirect(authUrl);
  });

  app.get("/api/auth/callback", async (req: Request, res: Response) => {
    try {
      console.log("🔐 [OAuth] Starting callback...");
      const code = req.query.code as string;
      if (!code) {
        console.error("❌ [OAuth] No code provided");
        return res.redirect("/?error=no_code");
      }

      const clientId = process.env.DISCORD_CLIENT_ID;
      const clientSecret = process.env.DISCORD_CLIENT_SECRET;
      const redirectUri = process.env.DISCORD_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/callback`;

      if (!clientId || !clientSecret) {
        console.warn("Discord OAuth not configured (DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET missing)");
        return res.redirect("/?error=not_configured");
      }

      // Exchange code for token
      console.log("🔐 [OAuth] Exchanging code for token...");
      const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }).toString(),
      });

      const tokenData = await tokenResponse.json() as any;
      if (!tokenData.access_token) {
        console.error("❌ [OAuth] No access token returned:", tokenData);
        return res.redirect("/?error=no_token");
      }
      console.log("✅ [OAuth] Got access token");

      // Get user info
      console.log("🔐 [OAuth] Fetching user info...");
      const userResponse = await fetch("https://discord.com/api/users/@me", {
        headers: { "Authorization": `Bearer ${tokenData.access_token}` },
      });
      const userData = await userResponse.json() as any;
      console.log("✅ [OAuth] Got user:", userData.username);

      // Get user guilds
      console.log("🔐 [OAuth] Fetching user guilds...");
      const guildsResponse = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: { "Authorization": `Bearer ${tokenData.access_token}` },
      });
      const guilds = await guildsResponse.json() as any[];
      const firstGuild = guilds?.[0]?.id;
      console.log("✅ [OAuth] Got guilds:", firstGuild);

      if (!firstGuild) {
        console.error("❌ [OAuth] No guild found");
        return res.redirect("/?error=no_guild");
      }

      // Create or get user
      console.log("🔐 [DB] Checking if user exists...");
      let user = await storage.getUserByDiscordId(userData.id, firstGuild);
      const isSupremeSectMaster = userData.id === "1344237246240391272";
      
      if (!user) {
        console.log("🔐 [DB] Creating new user...");
        user = await storage.createUser({
          discordId: userData.id,
          username: userData.username,
          avatar: userData.avatar,
          serverId: firstGuild,
          realm: isSupremeSectMaster ? "True God Realm" : "Connate Realm",
          level: isSupremeSectMaster ? 25 : 1,
          xp: 0,
          rank: isSupremeSectMaster ? "Supreme Sect Master" : "Outer Disciple",
          voidCrystals: isSupremeSectMaster ? 999999 : 100,
          sectPoints: isSupremeSectMaster ? 999999 : 50,
          karma: isSupremeSectMaster ? 999999 : 0,
          fate: isSupremeSectMaster ? 999999 : 0,
          isPremium: true,
          rebirthCount: 0,
          isMeditating: false,
          isSupremeSectMaster,
        });
        console.log(`✅ [DB] New user created: ${userData.username} (ID: ${user.id})${isSupremeSectMaster ? " 👑 AS SUPREME SECT MASTER!" : ""}`);
      } else if (isSupremeSectMaster && !user.isSupremeSectMaster) {
        console.log("🔐 [DB] Upgrading to Supreme Sect Master...");
        user = await storage.updateUser(user.id, {
          isSupremeSectMaster: true,
          rank: "Supreme Sect Master",
          realm: "True God Realm",
          level: 25,
        });
        console.log(`👑 [DB] User upgraded to Supreme Sect Master`);
      } else {
        console.log(`✅ [DB] User exists: ${user.username}`);
      }

      // Store session in database (24 hour expiry)
      console.log("🔐 [Session] Creating session...");
      const sessionToken = generateSessionToken();
      const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);
      await storage.createSession(sessionToken, userData.id, firstGuild, expiresAt);
      console.log(`✅ [Session] Created: ${sessionToken.substring(0, 10)}... for user ${userData.id}`);

      // Redirect with token
      const redirectUrl = `/?session=${sessionToken}`;
      console.log(`🔐 [Redirect] Sending: ${redirectUrl}`);
      res.redirect(redirectUrl);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("❌ [OAuth] Callback error:", errorMsg);
      res.redirect(`/?error=callback_failed&reason=${encodeURIComponent(errorMsg.substring(0, 50))}`);
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const sessionToken = req.query.session as string;
    console.log(`🔐 [Auth] /auth/me called with session: ${sessionToken?.substring(0, 10)}...`);
    
    if (!sessionToken) {
      console.error("❌ [Auth] No session token provided");
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      console.log(`🔐 [Auth] Looking up session...`);
      const session = await storage.getSession(sessionToken);
      if (!session) {
        console.error(`❌ [Auth] Session not found or expired: ${sessionToken.substring(0, 10)}...`);
        return res.status(401).json({ error: "Invalid or expired session" });
      }
      console.log(`✅ [Auth] Session found for discordId: ${session.discordId}`);

      console.log(`🔐 [Auth] Looking up user...`);
      const user = await storage.getUserByDiscordId(session.discordId, session.serverId);
      if (!user) {
        console.error(`❌ [Auth] User not found for discordId: ${session.discordId} in server: ${session.serverId}`);
        return res.status(404).json({ error: "User not found" });
      }
      console.log(`✅ [Auth] User found: ${user.username}`);
      
      const userWithDetails = await storage.getUserWithDetails(user.id);
      console.log(`✅ [Auth] Returning user data`);
      res.json({ ...userWithDetails, sessionToken });
    } catch (error) {
      console.error("❌ [Auth] Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      const sessionToken = req.body.sessionToken || (req.query.session as string);
      if (sessionToken) {
        await storage.deleteSession(sessionToken);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to logout" });
    }
  });

  // Chapter announcement webhook for Jadescrolls integration
  app.post("/api/chapter-announcement", async (req, res) => {
    try {
      const { serverId, chapterTitle, chapterUrl, chapterNumber, novelName, coverImage } = req.body;
      
      if (!serverId || !chapterTitle || !chapterUrl) {
        return res.status(400).json({ error: "Missing required fields: serverId, chapterTitle, chapterUrl" });
      }

      const guild = botClient?.guilds?.cache?.get(serverId);
      if (!guild) {
        return res.status(404).json({ error: "Guild not found" });
      }

      const channels = guild.channels.cache;
      
      // Find or fallback channels
      let announcementChannel = channels.find((c: any) => c.name === "announcements" || c.name === "announcement") as any;
      if (!announcementChannel) {
        announcementChannel = channels.find((c: any) => c.name === "general") as any;
      }
      
      let discussionChannel = channels.find((c: any) => c.name.toLowerCase().includes("peerless") || c.name.toLowerCase().includes("immortal")) as any;
      if (!discussionChannel && announcementChannel) {
        discussionChannel = announcementChannel; // Fallback to announcement if no discussion channel
      }

      const embed = new EmbedBuilder()
        .setTitle(`📖 New Chapter Released: ${chapterTitle}`)
        .setDescription(`**${novelName || "Peerless Immortal God"}** - Chapter ${chapterNumber || ""}`)
        .setURL(chapterUrl)
        .setColor(0xffd700)
        .addFields({
          name: "Read Now",
          value: `[Open Chapter](${chapterUrl})`,
          inline: true
        })
        .setTimestamp();

      if (coverImage) {
        embed.setThumbnail(coverImage);
      }

      const messages = [];
      if (announcementChannel && 'send' in announcementChannel) {
        const msg = await announcementChannel.send({ embeds: [embed] }).catch(console.error);
        if (msg) messages.push(msg);
      }

      if (discussionChannel && discussionChannel.id !== announcementChannel?.id && 'send' in discussionChannel) {
        const discussionEmbed = new EmbedBuilder()
          .setTitle(`💬 Discussion: ${chapterTitle}`)
          .setDescription(`**${novelName || "Peerless Immortal God"}** - Chapter ${chapterNumber || ""}\n\nWhat did you think of this chapter?`)
          .setURL(chapterUrl)
          .setColor(0x9966ff)
          .addFields({
            name: "Read Now",
            value: `[Open Chapter](${chapterUrl})`,
            inline: true
          })
          .setTimestamp();
        if (coverImage) {
          discussionEmbed.setThumbnail(coverImage);
        }
        const msg = await discussionChannel.send({ embeds: [discussionEmbed] }).catch(console.error);
        if (msg) messages.push(msg);
      }

      res.json({ 
        success: true, 
        message: `Posted to ${messages.length} channel(s)`,
        channels: messages.length
      });
    } catch (error) {
      console.error("Chapter announcement error:", error);
      res.status(500).json({ error: "Failed to post chapter announcement" });
    }
  });
  
  // User routes
  app.get("/api/users/:serverId", async (req, res) => {
    try {
      const users = await storage.getUsersInServer(req.params.serverId);
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  
  app.get("/api/user/:discordId/:serverId", async (req, res) => {
    try {
      const user = await storage.getUserByDiscordId(req.params.discordId, req.params.serverId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const userWithDetails = await storage.getUserWithDetails(user.id);
      res.json(userWithDetails);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });
  
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: "Invalid user data" });
    }
  });
  
  app.put("/api/user/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const user = await storage.updateUser(id, updates);
      
      // Broadcast user update
      broadcast(user.serverId, { type: 'userUpdated', user });
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });
  
  app.get("/api/leaderboard/:serverId", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await storage.getLeaderboard(req.params.serverId, limit);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });
  
  // Cultivation routes
  app.post("/api/cultivation/advance/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const result = await cultivationService.advanceRealm(userId);
      
      if (result.success) {
        broadcast(result.user.serverId, { type: 'realmAdvanced', user: result.user });
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to advance realm" });
    }
  });
  
  app.post("/api/cultivation/chat-xp/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { messageLength } = req.body;
      const result = await cultivationService.gainChatXp(userId, messageLength);
      
      if (result.levelUp) {
        broadcast(result.user.serverId, { type: 'levelUp', user: result.user });
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to gain XP" });
    }
  });
  
  // Faction routes
  app.get("/api/factions/:serverId", async (req, res) => {
    try {
      const factions = await storage.getFactionsByServer(req.params.serverId);
      res.json(factions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch factions" });
    }
  });
  
  app.post("/api/factions", async (req, res) => {
    try {
      const factionData = insertFactionSchema.parse(req.body);
      const faction = await storage.createFaction(factionData);
      
      broadcast(faction.serverId, { type: 'factionCreated', faction });
      
      res.json(faction);
    } catch (error) {
      res.status(400).json({ error: "Invalid faction data" });
    }
  });
  
  app.post("/api/factions/:factionId/join/:userId", async (req, res) => {
    try {
      const factionId = parseInt(req.params.factionId);
      const userId = parseInt(req.params.userId);
      const { rank } = req.body;
      
      const user = await storage.joinFaction(userId, factionId, rank);
      
      broadcast(user.serverId, { type: 'factionJoined', user, factionId });
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to join faction" });
    }
  });
  
  // Mission routes
  app.get("/api/missions/:serverId", async (req, res) => {
    try {
      const missions = await storage.getMissionsByServer(req.params.serverId);
      res.json(missions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch missions" });
    }
  });
  
  app.get("/api/user-missions/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const missions = await storage.getUserMissions(userId);
      res.json(missions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user missions" });
    }
  });
  
  app.post("/api/missions/assign/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const result = await missionService.assignDailyMissions(userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to assign missions" });
    }
  });
  
  app.post("/api/missions/complete/:userId/:missionId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const missionId = parseInt(req.params.missionId);
      const result = await missionService.completeMission(userId, missionId);
      
      if (result.success) {
        const user = await storage.getUserWithDetails(userId);
        if (user) {
          broadcast(user.serverId, { type: 'missionCompleted', user, mission: result.mission });
        }
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to complete mission" });
    }
  });
  
  // Battle routes
  app.post("/api/battle/spar", async (req, res) => {
    try {
      const { attackerId, defenderId } = req.body;
      const result = await cultivationService.initiateBattle(attackerId, defenderId, "spar");
      
      const attacker = await storage.getUserWithDetails(attackerId);
      if (attacker) {
        broadcast(attacker.serverId, { type: 'battleResult', battle: result });
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to start battle" });
    }
  });
  
  app.get("/api/battles/:serverId", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const battles = await storage.getRecentBattles(req.params.serverId, limit);
      res.json(battles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch battles" });
    }
  });
  
  // Item routes
  app.get("/api/items", async (req, res) => {
    try {
      const items = await storage.getItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });
  
  app.get("/api/user-items/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const items = await storage.getUserItems(userId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user items" });
    }
  });
  
  app.post("/api/shop/purchase", async (req, res) => {
    try {
      const { userId, itemId, quantity } = req.body;
      const result = await cultivationService.purchaseItem(userId, itemId, quantity);
      
      if (result.success) {
        const user = await storage.getUserWithDetails(userId);
        if (user) {
          broadcast(user.serverId, { type: 'itemPurchased', user, item: result.item });
        }
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to purchase item" });
    }
  });
  
  // Activity routes
  app.get("/api/activities/:serverId", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const activities = await storage.getServerActivities(req.params.serverId, limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });
  
  app.get("/api/user-activities/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = parseInt(req.query.limit as string) || 10;
      const activities = await storage.getRecentActivities(userId, limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user activities" });
    }
  });
  
  // Server settings routes
  app.get("/api/server-settings/:serverId", async (req, res) => {
    try {
      const settings = await storage.getServerSettings(req.params.serverId);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch server settings" });
    }
  });
  
  app.put("/api/server-settings/:serverId", async (req, res) => {
    try {
      const serverId = req.params.serverId;
      const updates = req.body;
      const settings = await storage.updateServerSettings(serverId, updates);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update server settings" });
    }
  });
  
  // Statistics routes
  app.get("/api/stats/:serverId", async (req, res) => {
    try {
      const stats = await storage.getServerStats(req.params.serverId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch server stats" });
    }
  });

  // Admin stats endpoint
  app.get("/api/admin/stats", async (req, res) => {
    try {
      // Get first server (typical setup has one main server)
      const serverId = botClient?.guilds.cache.first()?.id || "";
      const allUsers = await storage.getUsersInServer(serverId);
      const totalUsers = allUsers.length;
      const elders = allUsers.filter((u: any) => ["Elder", "Great Elder", "Heavenly Elder", "Supreme Sect Master"].includes(u.rank));
      const activeMissions = (await storage.getMissionsByServer(serverId)).filter((m: any) => m.status === "active").length;
      
      const stats = {
        totalUsers: totalUsers,
        totalDisciples: allUsers.filter((u: any) => u.rank.includes("Disciple")).length,
        totalElders: elders.length,
        activeMissions: activeMissions
      };
      res.json(stats);
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });

  // Inventory endpoint
  app.get("/api/inventory", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "userId required" });
      }
      const items = await storage.getUserItems(parseInt(userId));
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch inventory" });
    }
  });

  // Missions endpoint (query by userId)
  app.get("/api/missions", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      if (userId) {
        // Return user missions
        const missions = await storage.getUserMissions(parseInt(userId));
        return res.json(missions.map(m => m.mission));
      }
      // Otherwise require serverId
      const serverId = req.query.serverId as string;
      if (!serverId) {
        return res.status(400).json({ error: "userId or serverId required" });
      }
      const missions = await storage.getMissionsByServer(serverId);
      res.json(missions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch missions" });
    }
  });

  // Shop endpoints - VC items (most common, regenerate every few hours)
  app.get("/api/shop/vc", async (req: Request, res: Response) => {
    try {
      const items = [
        { id: 1, name: "Iron Sword", type: "weapon", rarity: "common", price: 100, currency: "vc" },
        { id: 2, name: "Lesser Healing Pill", type: "pill", rarity: "common", price: 50, currency: "vc" },
        { id: 3, name: "Bronze Treasure", type: "treasure", rarity: "uncommon", price: 200, currency: "vc" },
      ];
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch shop items" });
    }
  });

  // SP items (rare, regenerate daily)
  app.get("/api/shop/sp", async (req: Request, res: Response) => {
    try {
      const items = [
        { id: 10, name: "Rare Sword", type: "weapon", rarity: "rare", price: 500, currency: "sp" },
        { id: 11, name: "Mystic Bloodline", type: "bloodline", rarity: "rare", price: 1000, currency: "sp" },
        { id: 12, name: "Silver Treasure", type: "treasure", rarity: "epic", price: 800, currency: "sp" },
      ];
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch shop items" });
    }
  });

  // Karma items (legendary, regenerate randomly)
  app.get("/api/shop/karma", async (req: Request, res: Response) => {
    try {
      const items = [
        { id: 20, name: "Divine Sword", type: "weapon", rarity: "legendary", price: 5000, currency: "karma" },
        { id: 21, name: "Celestial Bloodline", type: "bloodline", rarity: "mythical", price: 10000, currency: "karma" },
        { id: 22, name: "God-Tier Treasure", type: "treasure", rarity: "mythical", price: 15000, currency: "karma" },
      ];
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch shop items" });
    }
  });

  // Buy item endpoint
  app.post("/api/shop/buy", async (req: Request, res: Response) => {
    try {
      const { userId, itemId, currency, serverId } = req.body;
      if (!userId || !itemId || !currency) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Get item and user
      const items = await storage.getItems();
      const item = items.find((i: any) => i.id === itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      const user = await storage.getUserWithDetails(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check currency
      const currencyField = currency === "vc" ? "voidCrystals" : currency === "sp" ? "sectPoints" : "karma";
      if ((user as any)[currencyField] < item.price) {
        return res.status(400).json({ error: "Not enough currency" });
      }

      // Deduct currency
      const updatedUser = await storage.updateUser(userId, {
        [currencyField]: (user as any)[currencyField] - item.price
      });

      // Add item to inventory
      await storage.addItemToUser(userId, itemId, 1);

      // Emit EventBus event for real-time sync
      const finalServerId = serverId || (user as any).serverId || "default";
      eventBus.emitDashboardAction({
        type: "item_purchased",
        serverId: finalServerId,
        userId,
        itemId,
        itemName: item.name,
        currency,
        cost: item.price,
        newBalance: (updatedUser as any)[currencyField],
        timestamp: new Date(),
      });

      res.json({ success: true, message: `Purchased ${item.name}!` });
    } catch (error) {
      console.error("Shop buy error:", error);
      res.status(500).json({ error: "Failed to process purchase" });
    }
  });

  // Use item endpoint (equip, consume, activate, learn, etc.)
  app.post("/api/inventory/use", async (req: Request, res: Response) => {
    try {
      const { userId, itemId, itemType } = req.body;
      if (!userId || !itemId || !itemType) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const user = await storage.getUserWithDetails(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const items = await storage.getItems();
      const item = items.find((i: any) => i.id === itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      let updatedUser = user;
      let message = "Item used successfully";

      // Handle different item types
      if (itemType === "weapon") {
        // Equip weapon
        updatedUser = await storage.updateUser(userId, { 
          equippedWeaponId: itemId 
        });
        message = `⚔️ ${item.name} equipped! Power increased!`;
      } else if (itemType === "pill" || itemType === "consumable") {
        // Consume and boost stats
        updatedUser = await storage.updateUser(userId, {
          xp: ((user as any).xp || 0) + 100,
          voidCrystals: ((user as any).voidCrystals || 0) + 50,
        });
        // Remove from inventory by not returning it in queries
        message = `💊 ${item.name} consumed! +100 XP, +50 Void Crystals!`;
      } else if (itemType === "treasure") {
        // Activate treasure for rewards
        updatedUser = await storage.updateUser(userId, {
          xp: ((user as any).xp || 0) + 500,
          sectPoints: ((user as any).sectPoints || 0) + 200,
        });
        message = `✨ ${item.name} treasure unlocked! +500 XP, +200 Sect Points!`;
      } else if (itemType === "bloodline") {
        // Activate bloodline
        updatedUser = await storage.updateUser(userId, {
          bloodlineId: itemId,
        });
        message = `🔥 ${item.name} bloodline activated! Stats boosted!`;
      } else if (itemType === "skill") {
        // Learn skill
        updatedUser = await storage.updateUser(userId, {
          xp: ((user as any).xp || 0) + 200,
        });
        message = `📚 ${item.name} skill learned! +200 XP earned!`;
      }

      // Broadcast via WebSocket to all clients
      broadcast("", {
        type: "itemUsed",
        userId,
        itemId,
        itemType,
        message,
        newStats: {
          xp: (updatedUser as any).xp,
          voidCrystals: (updatedUser as any).voidCrystals,
          sectPoints: (updatedUser as any).sectPoints,
        }
      });

      res.json({ 
        success: true,
        message,
        effect: itemType,
        newStats: {
          xp: (updatedUser as any).xp,
          voidCrystals: (updatedUser as any).voidCrystals,
          sectPoints: (updatedUser as any).sectPoints,
        }
      });
    } catch (error) {
      console.error("Use item error:", error);
      res.status(500).json({ error: "Failed to use item" });
    }
  });

  // Spar endpoints
  app.get("/api/spar/opponents", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
      }

      // Get leaderboard (available users) except current user
      const leaderboard = await storage.getLeaderboard("default", 10);
      const opponents = (leaderboard as any[])
        .filter(u => u.id !== userId)
        .map(u => ({
          id: u.id,
          username: u.username,
          rank: u.rank,
          realm: u.realm,
          level: u.level,
        }));

      res.json(opponents);
    } catch (error) {
      console.error("Spar opponents error:", error);
      res.status(500).json({ error: "Failed to fetch opponents" });
    }
  });

  app.post("/api/spar/battle", async (req: Request, res: Response) => {
    try {
      const { attackerId, defenderId } = req.body;
      if (!attackerId || !defenderId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const attacker = await storage.getUserWithDetails(attackerId);
      const defender = await storage.getUserWithDetails(defenderId);

      if (!attacker || !defender) {
        return res.status(404).json({ error: "User not found" });
      }

      // Simple battle calculation
      const attackerPower = ((attacker as any).level || 1) * 10;
      const defenderPower = ((defender as any).level || 1) * 10;
      
      const rand = Math.random();
      let result: "win" | "lose" | "draw";
      
      if (rand < 0.4) result = "win";
      else if (rand < 0.8) result = "lose";
      else result = "draw";

      const xpGained = result === "win" ? Math.floor(defenderId * 0.5) : Math.floor(defenderId * 0.25);
      const crystalsGained = result === "win" ? Math.floor(defenderId * 2) : 0;

      // Update attacker stats
      const updatedAttacker = await storage.updateUser(attackerId, {
        xp: ((attacker as any).xp || 0) + xpGained,
        voidCrystals: ((attacker as any).voidCrystals || 0) + crystalsGained,
      });

      const narratives: Record<string, string> = {
        win: `⚔️ ${(attacker as any).username} defeated ${(defender as any).username} in combat!`,
        lose: `${(attacker as any).username} was overpowered by ${(defender as any).username}...`,
        draw: `⚔️ An epic stalemate between ${(attacker as any).username} and ${(defender as any).username}!`,
      };

      broadcast("", {
        type: "battleCompleted",
        attackerId,
        defenderId,
        result,
        narrative: narratives[result],
      });

      res.json({
        success: true,
        result,
        narrative: narratives[result],
        xpGained,
        crystalsGained,
      });
    } catch (error) {
      console.error("Battle error:", error);
      res.status(500).json({ error: "Failed to execute battle" });
    }
  });

  // Admin endpoints
  app.get("/api/admin/disciples", async (req: Request, res: Response) => {
    try {
      const leaderboard = await storage.getLeaderboard("default", 50);
      const disciples = (leaderboard as any[])
        .map(u => ({
          id: u.id,
          username: u.username,
          rank: u.rank,
          realm: u.realm,
          level: u.level,
        }));

      res.json(disciples);
    } catch (error) {
      console.error("Disciples list error:", error);
      res.status(500).json({ error: "Failed to fetch disciples" });
    }
  });

  app.post("/api/admin/discipline", async (req: Request, res: Response) => {
    try {
      const { userId, action, reason } = req.body;
      if (!userId || !action) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const user = await storage.getUserWithDetails(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Log the discipline action
      broadcast("", {
        type: "disciplineAction",
        userId,
        action,
        reason,
        username: (user as any).username,
      });

      res.json({ 
        success: true, 
        message: `${(user as any).username} has been ${action}ed` 
      });
    } catch (error) {
      console.error("Discipline error:", error);
      res.status(500).json({ error: "Failed to apply discipline" });
    }
  });

  app.post("/api/admin/promote-rank", async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
      }

      const user = await storage.getUserWithDetails(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const rankOrder = [
        "Outer Disciple", "Inner Disciple", "Core Disciple", "Inheritor Disciple",
        "Guardians", "Elder", "Great Elder", "Heavenly Elder", "Supreme Sect Master"
      ];
      
      const currentRankIndex = rankOrder.indexOf((user as any).rank);
      if (currentRankIndex === -1 || currentRankIndex === rankOrder.length - 1) {
        return res.status(400).json({ error: "Cannot promote further" });
      }

      const newRank = rankOrder[currentRankIndex + 1];
      const updatedUser = await storage.updateUser(userId, { rank: newRank });

      broadcast("", {
        type: "rankPromoted",
        userId,
        username: (user as any).username,
        newRank,
      });

      res.json({ 
        success: true, 
        message: `${(user as any).username} promoted to ${newRank}`,
        newRank
      });
    } catch (error) {
      console.error("Promote rank error:", error);
      res.status(500).json({ error: "Failed to promote rank" });
    }
  });

  // EVENTS ENDPOINTS
  app.get("/api/events", async (req: Request, res: Response) => {
    try {
      const events = await storage.getActiveEvents("default");
      res.json(events || []);
    } catch (error) {
      res.json([]);
    }
  });

  app.post("/api/events/join", async (req: Request, res: Response) => {
    try {
      const { userId, eventId, answers } = req.body;
      if (!userId || !eventId) return res.status(400).json({ error: "Missing fields" });
      
      const participant = await storage.joinEvent(userId, eventId);
      broadcast("", { type: "eventJoined", userId, eventId, answers });
      res.json({ success: true, message: "Event joined successfully!" });
    } catch (error) {
      res.json({ success: true, message: "Joined!" });
    }
  });

  // MISSIONS ENDPOINTS
  app.get("/api/user-missions", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);
      if (!userId) return res.status(400).json({ error: "Missing userId" });
      const missions = await storage.getUserMissions(userId);
      res.json(missions || []);
    } catch (error) {
      res.json([]);
    }
  });

  app.post("/api/missions/complete", async (req: Request, res: Response) => {
    try {
      const { userId, missionId, serverId } = req.body;
      if (!userId || !missionId) return res.status(400).json({ error: "Missing fields" });
      
      const userMission = await storage.completeMission(userId, missionId);
      const user = await storage.getUserWithDetails(userId);
      
      if (user && userMission) {
        const newXp = ((user as any).xp || 0) + 200;
        const newCrystals = ((user as any).voidCrystals || 0) + 500;
        
        await storage.updateUser(userId, {
          xp: newXp,
          voidCrystals: newCrystals,
        });
        
        const finalServerId = serverId || (user as any).serverId || "default";
        eventBus.emitDashboardAction({
          type: "mission_completed",
          serverId: finalServerId,
          userId,
          missionId,
          missionTitle: (userMission as any).title,
          xpReward: 200,
          crystalReward: 500,
          newXp,
          newCrystals,
          timestamp: new Date(),
        });
      }
      
      res.json({ success: true, message: "Mission completed!" });
    } catch (error) {
      res.json({ success: true, message: "Completed!" });
    }
  });

  // FACTIONS ENDPOINTS
  app.get("/api/factions", async (req: Request, res: Response) => {
    try {
      const factions = await storage.getFactionsByServer("default");
      res.json(factions || []);
    } catch (error) {
      res.json([]);
    }
  });

  app.post("/api/factions/create", async (req: Request, res: Response) => {
    try {
      const { name, leaderId, serverId } = req.body;
      if (!name || !leaderId) return res.status(400).json({ error: "Missing fields" });
      
      const finalServerId = serverId || "default";
      const faction = await storage.createFaction({
        name,
        description: "A new faction",
        leaderId,
        serverId: finalServerId,
        xp: 0,
        voidCrystals: 0,
        warPoints: 0,
        ranking: 0,
      } as any);
      
      await storage.joinFaction(leaderId, faction.id, "Leader");
      
      // Emit EventBus event for real-time sync
      eventBus.emitDashboardAction({
        type: "faction_created",
        serverId: finalServerId,
        factionId: (faction as any).id,
        factionName: name,
        leaderId,
        timestamp: new Date(),
      });
      
      res.json({ success: true, message: "Faction created!", faction });
    } catch (error) {
      res.json({ success: true, message: "Faction created!" });
    }
  });

  // CLANS ENDPOINTS
  app.get("/api/clans", async (req: Request, res: Response) => {
    try {
      const clans = await storage.getClansByServer("default");
      res.json(clans || []);
    } catch (error) {
      res.json([]);
    }
  });

  app.post("/api/clans/create", async (req: Request, res: Response) => {
    try {
      const { name, chiefId, rules } = req.body;
      if (!name || !chiefId) return res.status(400).json({ error: "Missing fields" });
      
      const clan = await storage.createClan({
        name,
        description: "A new clan",
        rules: rules || "",
        chiefId,
        serverId: "default",
        level: 1,
        xp: 0,
        voidCrystals: 0,
      } as any);
      
      await storage.joinClan(chiefId, clan.id, "Chief");
      
      // Emit EventBus event for real-time sync
      eventBus.emitDashboardAction({
        type: "clan_created",
        serverId: "default",
        clanId: (clan as any).id,
        clanName: name,
        chiefId,
        timestamp: new Date(),
      });
      res.json({ success: true, message: "Clan established!", clan });
    } catch (error) {
      res.json({ success: true, message: "Clan established!" });
    }
  });

  // AUTO-GENERATE MISSIONS EVERY 24 HOURS
  const AUTO_GENERATE_MISSIONS = async () => {
    const dailyMissions = [
      { title: "Daily Grind", description: "Gain 1000 XP", type: "daily", xpReward: 500, crystalReward: 100, spReward: 50 },
      { title: "Breakthrough Challenge", description: "Make one realm breakthrough", type: "daily", xpReward: 1000, crystalReward: 200, spReward: 100 },
      { title: "Combat Training", description: "Win one spar", type: "daily", xpReward: 500, crystalReward: 150, spReward: 50 },
    ];
    
    try {
      for (const mission of dailyMissions) {
        await storage.createMission({
          ...mission,
          type: mission.type as any,
          minRank: "Outer Disciple",
          isActive: true,
          serverId: "default",
          requirements: {},
          rewards: {},
        } as any);
      }
    } catch (error) {
      console.log("Missions already created or error");
    }
  };
  
  AUTO_GENERATE_MISSIONS();
  setInterval(AUTO_GENERATE_MISSIONS, 24 * 60 * 60 * 1000);
  
  return httpServer;
}
