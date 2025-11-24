import { 
  users, bloodlines, factions, clans, tokens, items, userItems, missions, userMissions, 
  battles, activities, serverSettings,
  type User, type InsertUser, type Bloodline, type InsertBloodline,
  type Faction, type InsertFaction, type Clan, type InsertClan, type Token, type InsertToken,
  type Item, type InsertItem, type UserItem, type Mission, type InsertMission, type UserMission,
  type Battle, type InsertBattle, type Activity, type InsertActivity,
  type ServerSettings, type InsertServerSettings
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, gte, lte, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUserByDiscordId(discordId: string, serverId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  getUsersInServer(serverId: string): Promise<User[]>;
  getUserWithDetails(id: number): Promise<User & { bloodline?: Bloodline; faction?: Faction } | undefined>;
  getLeaderboard(serverId: string, limit?: number): Promise<User[]>;
  
  // Bloodline operations
  getBloodlines(): Promise<Bloodline[]>;
  getBloodlineById(id: number): Promise<Bloodline | undefined>;
  createBloodline(bloodline: InsertBloodline): Promise<Bloodline>;
  
  // Faction operations
  getFactionsByServer(serverId: string): Promise<Faction[]>;
  getFactionById(id: number): Promise<Faction | undefined>;
  createFaction(faction: InsertFaction): Promise<Faction>;
  updateFaction(id: number, updates: Partial<Faction>): Promise<Faction>;
  joinFaction(userId: number, factionId: number, rank?: string): Promise<User>;
  leaveFaction(userId: number): Promise<User>;
  
  // Clan operations
  getClansByServer(serverId: string): Promise<Clan[]>;
  getClanById(id: number): Promise<Clan | undefined>;
  createClan(clan: InsertClan): Promise<Clan>;
  updateClan(id: number, updates: Partial<Clan>): Promise<Clan>;
  joinClan(userId: number, clanId: number, role?: string): Promise<User>;
  leaveClan(userId: number): Promise<User>;
  
  // Token operations
  getUserTokens(userId: number): Promise<Token[]>;
  getTokensByType(userId: number, type: string): Promise<Token[]>;
  giveToken(userId: number, type: string, quantity?: number): Promise<Token>;
  useToken(tokenId: number): Promise<void>;
  
  // Item operations
  getItems(): Promise<Item[]>;
  getItemById(id: number): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  getUserItems(userId: number): Promise<(UserItem & { item: Item })[]>;
  addItemToUser(userId: number, itemId: number, quantity?: number): Promise<UserItem>;
  removeItemFromUser(userId: number, itemId: number, quantity?: number): Promise<void>;
  equipItem(userId: number, itemId: number): Promise<void>;
  unequipItem(userId: number, itemId: number): Promise<void>;
  
  // Mission operations
  getMissionsByServer(serverId: string): Promise<Mission[]>;
  createMission(mission: InsertMission): Promise<Mission>;
  getUserMissions(userId: number): Promise<(UserMission & { mission: Mission })[]>;
  assignMission(userId: number, missionId: number): Promise<UserMission>;
  updateMissionProgress(userId: number, missionId: number, progress: any): Promise<UserMission>;
  completeMission(userId: number, missionId: number): Promise<UserMission>;
  
  // Battle operations
  createBattle(battle: InsertBattle): Promise<Battle>;
  getBattleHistory(userId: number, limit?: number): Promise<Battle[]>;
  getRecentBattles(serverId: string, limit?: number): Promise<(Battle & { attackerUser: User; defenderUser: User })[]>;
  
  // Activity operations
  createActivity(activity: InsertActivity): Promise<Activity>;
  getRecentActivities(userId: number, limit?: number): Promise<Activity[]>;
  getServerActivities(serverId: string, limit?: number): Promise<(Activity & { user: User })[]>;
  
  // Server settings
  getServerSettings(serverId: string): Promise<ServerSettings | undefined>;
  updateServerSettings(serverId: string, updates: Partial<ServerSettings>): Promise<ServerSettings>;
  
  // Statistics
  getServerStats(serverId: string): Promise<{
    totalUsers: number;
    totalFactions: number;
    totalBattles: number;
    averageLevel: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUserByDiscordId(discordId: string, serverId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.discordId, discordId), eq(users.serverId, serverId)));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...updates, lastActive: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async getUsersInServer(serverId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.serverId, serverId))
      .orderBy(desc(users.level), desc(users.xp));
  }

  async getUserWithDetails(id: number): Promise<User & { bloodline?: Bloodline; faction?: Faction } | undefined> {
    const result = await db
      .select()
      .from(users)
      .leftJoin(bloodlines, eq(users.bloodlineId, bloodlines.id))
      .leftJoin(factions, eq(users.factionId, factions.id))
      .where(eq(users.id, id));
    
    const row = result[0];
    if (!row) return undefined;
    
    return {
      ...row.users,
      bloodline: row.bloodlines || undefined,
      faction: row.factions || undefined,
    };
  }

  async getLeaderboard(serverId: string, limit = 10): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.serverId, serverId))
      .orderBy(desc(users.level), desc(users.xp))
      .limit(limit);
  }

  async getBloodlines(): Promise<Bloodline[]> {
    return await db.select().from(bloodlines);
  }

  async getBloodlineById(id: number): Promise<Bloodline | undefined> {
    const [bloodline] = await db.select().from(bloodlines).where(eq(bloodlines.id, id));
    return bloodline || undefined;
  }

  async createBloodline(bloodline: InsertBloodline): Promise<Bloodline> {
    const [newBloodline] = await db.insert(bloodlines).values(bloodline).returning();
    return newBloodline;
  }

  async getFactionsByServer(serverId: string): Promise<Faction[]> {
    return await db
      .select()
      .from(factions)
      .where(eq(factions.serverId, serverId))
      .orderBy(desc(factions.warPoints));
  }

  async getFactionById(id: number): Promise<Faction | undefined> {
    const [faction] = await db.select().from(factions).where(eq(factions.id, id));
    return faction || undefined;
  }

  async createFaction(faction: InsertFaction): Promise<Faction> {
    const [newFaction] = await db.insert(factions).values(faction).returning();
    return newFaction;
  }

  async updateFaction(id: number, updates: Partial<Faction>): Promise<Faction> {
    const [updatedFaction] = await db
      .update(factions)
      .set(updates)
      .where(eq(factions.id, id))
      .returning();
    return updatedFaction;
  }

  async joinFaction(userId: number, factionId: number, rank = "Member"): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ factionId, factionRank: rank })
      .where(eq(users.id, userId))
      .returning();
    
    // Update faction member count
    await db
      .update(factions)
      .set({ memberCount: sql`${factions.memberCount} + 1` })
      .where(eq(factions.id, factionId));
    
    return updatedUser;
  }

  async leaveFaction(userId: number): Promise<User> {
    const user = await db.select().from(users).where(eq(users.id, userId));
    if (user[0]?.factionId) {
      await db
        .update(factions)
        .set({ memberCount: sql`${factions.memberCount} - 1` })
        .where(eq(factions.id, user[0].factionId));
    }
    
    const [updatedUser] = await db
      .update(users)
      .set({ factionId: null, factionRank: null })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  async getClansByServer(serverId: string): Promise<Clan[]> {
    return await db
      .select()
      .from(clans)
      .where(eq(clans.serverId, serverId))
      .orderBy(desc(clans.prestige));
  }

  async getClanById(id: number): Promise<Clan | undefined> {
    const [clan] = await db.select().from(clans).where(eq(clans.id, id));
    return clan || undefined;
  }

  async createClan(clan: InsertClan): Promise<Clan> {
    const [newClan] = await db.insert(clans).values(clan).returning();
    return newClan;
  }

  async updateClan(id: number, updates: Partial<Clan>): Promise<Clan> {
    const [updatedClan] = await db
      .update(clans)
      .set(updates)
      .where(eq(clans.id, id))
      .returning();
    return updatedClan;
  }

  async joinClan(userId: number, clanId: number, role = "Member"): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ clanId, clanRole: role })
      .where(eq(users.id, userId))
      .returning();
    
    await db
      .update(clans)
      .set({ memberCount: sql`${clans.memberCount} + 1` })
      .where(eq(clans.id, clanId));
    
    return updatedUser;
  }

  async leaveClan(userId: number): Promise<User> {
    const user = await db.select().from(users).where(eq(users.id, userId));
    if (user[0]?.clanId) {
      await db
        .update(clans)
        .set({ memberCount: sql`${clans.memberCount} - 1` })
        .where(eq(clans.id, user[0].clanId));
    }
    
    const [updatedUser] = await db
      .update(users)
      .set({ clanId: null, clanRole: null })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  async getUserTokens(userId: number): Promise<Token[]> {
    return await db
      .select()
      .from(tokens)
      .where(eq(tokens.userId, userId))
      .orderBy(desc(tokens.acquiredAt));
  }

  async getTokensByType(userId: number, type: string): Promise<Token[]> {
    return await db
      .select()
      .from(tokens)
      .where(and(eq(tokens.userId, userId), eq(tokens.type, type as any)))
      .orderBy(desc(tokens.acquiredAt));
  }

  async giveToken(userId: number, type: string, quantity = 1): Promise<Token> {
    const [newToken] = await db
      .insert(tokens)
      .values({ userId, type: type as any, quantity })
      .returning();
    return newToken;
  }

  async useToken(tokenId: number): Promise<void> {
    await db
      .update(tokens)
      .set({ usedAt: new Date() })
      .where(eq(tokens.id, tokenId));
  }

  async getItems(): Promise<Item[]> {
    return await db.select().from(items);
  }

  async getItemById(id: number): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item || undefined;
  }

  async createItem(item: InsertItem): Promise<Item> {
    const [newItem] = await db.insert(items).values(item).returning();
    return newItem;
  }

  async getUserItems(userId: number): Promise<(UserItem & { item: Item })[]> {
    const result = await db
      .select()
      .from(userItems)
      .innerJoin(items, eq(userItems.itemId, items.id))
      .where(eq(userItems.userId, userId));
    
    return result.map(row => ({
      ...row.user_items,
      item: row.items,
    }));
  }

  async addItemToUser(userId: number, itemId: number, quantity = 1): Promise<UserItem> {
    const [userItem] = await db
      .insert(userItems)
      .values({ userId, itemId, quantity })
      .returning();
    return userItem;
  }

  async removeItemFromUser(userId: number, itemId: number, quantity = 1): Promise<void> {
    await db
      .delete(userItems)
      .where(and(eq(userItems.userId, userId), eq(userItems.itemId, itemId)));
  }

  async equipItem(userId: number, itemId: number): Promise<void> {
    await db
      .update(userItems)
      .set({ isEquipped: true })
      .where(and(eq(userItems.userId, userId), eq(userItems.itemId, itemId)));
  }

  async unequipItem(userId: number, itemId: number): Promise<void> {
    await db
      .update(userItems)
      .set({ isEquipped: false })
      .where(and(eq(userItems.userId, userId), eq(userItems.itemId, itemId)));
  }

  async getMissionsByServer(serverId: string): Promise<Mission[]> {
    return await db
      .select()
      .from(missions)
      .where(and(eq(missions.serverId, serverId), eq(missions.isActive, true)));
  }

  async createMission(mission: InsertMission): Promise<Mission> {
    const [newMission] = await db.insert(missions).values(mission).returning();
    return newMission;
  }

  async getUserMissions(userId: number): Promise<(UserMission & { mission: Mission })[]> {
    const result = await db
      .select()
      .from(userMissions)
      .innerJoin(missions, eq(userMissions.missionId, missions.id))
      .where(eq(userMissions.userId, userId))
      .orderBy(desc(userMissions.assignedAt));
    
    return result.map(row => ({
      ...row.user_missions,
      mission: row.missions,
    }));
  }

  async assignMission(userId: number, missionId: number): Promise<UserMission> {
    const [userMission] = await db
      .insert(userMissions)
      .values({ userId, missionId })
      .returning();
    return userMission;
  }

  async updateMissionProgress(userId: number, missionId: number, progress: any): Promise<UserMission> {
    const [updatedMission] = await db
      .update(userMissions)
      .set({ progress })
      .where(and(eq(userMissions.userId, userId), eq(userMissions.missionId, missionId)))
      .returning();
    return updatedMission;
  }

  async completeMission(userId: number, missionId: number): Promise<UserMission> {
    const [completedMission] = await db
      .update(userMissions)
      .set({ status: "completed", completedAt: new Date() })
      .where(and(eq(userMissions.userId, userId), eq(userMissions.missionId, missionId)))
      .returning();
    return completedMission;
  }

  async createBattle(battle: InsertBattle): Promise<Battle> {
    const [newBattle] = await db.insert(battles).values(battle).returning();
    return newBattle;
  }

  async getBattleHistory(userId: number, limit = 10): Promise<Battle[]> {
    return await db
      .select()
      .from(battles)
      .where(or(eq(battles.attacker, userId), eq(battles.defender, userId)))
      .orderBy(desc(battles.createdAt))
      .limit(limit);
  }

  async getRecentBattles(serverId: string, limit = 10): Promise<(Battle & { attackerUser: User; defenderUser: User })[]> {
    const result = await db
      .select()
      .from(battles)
      .innerJoin(users, eq(battles.attacker, users.id))
      .innerJoin(users, eq(battles.defender, users.id))
      .where(eq(battles.serverId, serverId))
      .orderBy(desc(battles.createdAt))
      .limit(limit);
    
    // Note: This is a simplified version - in practice, you'd need to handle the joins differently
    return result.map(row => ({
      ...row.battles,
      attackerUser: row.users,
      defenderUser: row.users, // This would need proper handling
    }));
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db.insert(activities).values(activity).returning();
    return newActivity;
  }

  async getRecentActivities(userId: number, limit = 10): Promise<Activity[]> {
    return await db
      .select()
      .from(activities)
      .where(eq(activities.userId, userId))
      .orderBy(desc(activities.createdAt))
      .limit(limit);
  }

  async getServerActivities(serverId: string, limit = 10): Promise<(Activity & { user: User })[]> {
    const result = await db
      .select()
      .from(activities)
      .innerJoin(users, eq(activities.userId, users.id))
      .where(eq(activities.serverId, serverId))
      .orderBy(desc(activities.createdAt))
      .limit(limit);
    
    return result.map(row => ({
      ...row.activities,
      user: row.users,
    }));
  }

  async getServerSettings(serverId: string): Promise<ServerSettings | undefined> {
    const [settings] = await db
      .select()
      .from(serverSettings)
      .where(eq(serverSettings.serverId, serverId));
    return settings || undefined;
  }

  async updateServerSettings(serverId: string, updates: Partial<ServerSettings>): Promise<ServerSettings> {
    const [updatedSettings] = await db
      .update(serverSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(serverSettings.serverId, serverId))
      .returning();
    return updatedSettings;
  }

  async getServerStats(serverId: string): Promise<{
    totalUsers: number;
    totalFactions: number;
    totalBattles: number;
    averageLevel: number;
  }> {
    const [userStats] = await db
      .select({ 
        totalUsers: count(),
        averageLevel: sql<number>`AVG(${users.level})::int`
      })
      .from(users)
      .where(eq(users.serverId, serverId));
    
    const [factionStats] = await db
      .select({ totalFactions: count() })
      .from(factions)
      .where(eq(factions.serverId, serverId));
    
    const [battleStats] = await db
      .select({ totalBattles: count() })
      .from(battles)
      .where(eq(battles.serverId, serverId));
    
    return {
      totalUsers: userStats?.totalUsers || 0,
      totalFactions: factionStats?.totalFactions || 0,
      totalBattles: battleStats?.totalBattles || 0,
      averageLevel: userStats?.averageLevel || 0,
    };
  }
}

export const storage = new DatabaseStorage();
