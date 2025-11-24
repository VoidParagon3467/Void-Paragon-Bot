import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { cultivationService } from "./cultivation";
import { missionService } from "./missions";
import { insertUserSchema, insertFactionSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
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
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client.serverId === serverId) {
        client.send(JSON.stringify(data));
      }
    });
  };
  
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
        broadcast(user.serverId, { type: 'missionCompleted', user, mission: result.mission });
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
      broadcast(attacker.serverId, { type: 'battleResult', battle: result });
      
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
        broadcast(user.serverId, { type: 'itemPurchased', user, item: result.item });
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
