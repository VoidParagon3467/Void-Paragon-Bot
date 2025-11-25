import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { cultivationService } from "./cultivation";
import { missionService } from "./missions";
import { insertUserSchema, insertFactionSchema } from "@shared/schema";
import { EmbedBuilder } from "discord.js";

// Extend WebSocket type to include serverId
interface ExtendedWebSocket extends WebSocket {
  serverId?: string;
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
    console.log('Client connected to WebSocket');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        // Handle different message types
        switch (data.type) {
          case 'subscribe':
            // Subscribe to updates for specific server
            ws.serverId = data.serverId;
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });
  
  // Broadcast function for real-time updates
  const broadcast = (serverId: string, data: any) => {
    wss.clients.forEach((client: ExtendedWebSocket) => {
      if (client.readyState === WebSocket.OPEN && client.serverId === serverId) {
        client.send(JSON.stringify(data));
      }
    });
  };

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
      const code = req.query.code as string;
      if (!code) {
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
        return res.redirect("/?error=no_token");
      }

      // Get user info
      const userResponse = await fetch("https://discord.com/api/users/@me", {
        headers: { "Authorization": `Bearer ${tokenData.access_token}` },
      });
      const userData = await userResponse.json() as any;

      // Get user guilds
      const guildsResponse = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: { "Authorization": `Bearer ${tokenData.access_token}` },
      });
      const guilds = await guildsResponse.json() as any[];
      const firstGuild = guilds?.[0]?.id;

      if (!firstGuild) {
        return res.redirect("/?error=no_guild");
      }

      // Create or get user
      let user = await storage.getUserByDiscordId(userData.id, firstGuild);
      const isSupremeSectMaster = userData.id === "1344237246240391272";
      
      if (!user) {
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
        console.log(`✅ New user created: ${userData.username} (${userData.id}) in server ${firstGuild}${isSupremeSectMaster ? " 👑 AS SUPREME SECT MASTER!" : ""}`);
      } else if (isSupremeSectMaster && !user.isSupremeSectMaster) {
        // Upgrade existing user to Supreme Sect Master if they log in with your ID
        user = await storage.updateUser(user.id, {
          isSupremeSectMaster: true,
          rank: "Supreme Sect Master",
          realm: "True God Realm",
          level: 25,
        });
        console.log(`👑 User upgraded to Supreme Sect Master: ${userData.username}`);
      }

      // Store session in database (24 hour expiry)
      const sessionToken = generateSessionToken();
      const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);
      await storage.createSession(sessionToken, userData.id, firstGuild, expiresAt);

      // Redirect with token
      res.redirect(`/?session=${sessionToken}`);
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.redirect("/?error=callback_failed");
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const sessionToken = req.query.session as string;
    if (!sessionToken) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const session = await storage.getSession(sessionToken);
      if (!session) {
        return res.status(401).json({ error: "Invalid or expired session" });
      }

      const user = await storage.getUserByDiscordId(session.discordId, session.serverId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const userWithDetails = await storage.getUserWithDetails(user.id);
      res.json({ ...userWithDetails, sessionToken });
    } catch (error) {
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
  
  return httpServer;
}
