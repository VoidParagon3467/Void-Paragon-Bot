import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const rarityEnum = pgEnum("rarity", ["common", "uncommon", "rare", "epic", "legendary", "mythical"]);
export const itemTypeEnum = pgEnum("item_type", ["weapon", "armor", "consumable", "treasure", "skill"]);
export const missionTypeEnum = pgEnum("mission_type", ["daily", "weekly", "monthly", "special"]);
export const missionStatusEnum = pgEnum("mission_status", ["active", "completed", "failed", "expired"]);
export const battleTypeEnum = pgEnum("battle_type", ["spar", "faction_war", "mission", "duel"]);
export const battleResultEnum = pgEnum("battle_result", ["win", "lose", "draw"]);

// Cultivation realms (25 total) - exactly as specified by user
export const cultivationRealms = [
  "Connate Realm", "Yin Realm", "Yang Realm", "Spirit Realm", "Imperial Realm", "Deity Realm",
  "Dao Realm", "True Spirit Realm", "Martial Spirit Realm", "Heavenly Spirit Realm", "True Emperor Realm", "Martial Emperor Realm",
  "Heavenly Emperor Realm", "Sovereign Emperor Realm", "Divine Emperor Realm", "Divine Lord Realm", "Divine King Realm",
  "World King Realm", "Immortal Ascension Realm", "Immortal Lord Realm", "Immortal King Realm", "Immortal Emperor Realm",
  "Immortal God Realm", "GodKing Realm", "True God Realm"
] as const;

export const realmEnum = pgEnum("realm", cultivationRealms);

// Users/Players table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull().unique(),
  username: text("username").notNull(),
  avatar: text("avatar"),
  // Cultivation stats - following exact user specification
  realm: realmEnum("realm").notNull().default("Connate Realm"),
  level: integer("level").notNull().default(1), // Level within current realm (1-9 for most realms)
  xp: integer("xp").notNull().default(0),
  rank: text("rank").notNull().default("Outer Disciple"), // Named ranks as specified
  // Currency
  voidCrystals: integer("void_crystals").notNull().default(0),
  spiritPoints: integer("spirit_points").notNull().default(0), // SP
  karma: integer("karma").notNull().default(0),
  fate: integer("fate").notNull().default(0),
  // Bloodline
  bloodlineId: integer("bloodline_id"),
  // Faction
  factionId: integer("faction_id"),
  factionRank: text("faction_rank"),
  // Premium
  isPremium: boolean("is_premium").notNull().default(false),
  premiumExpiresAt: timestamp("premium_expires_at"),
  // Rebirth
  rebirthCount: integer("rebirth_count").notNull().default(0),
  // Meta
  createdAt: timestamp("created_at").defaultNow(),
  lastActive: timestamp("last_active").defaultNow(),
  // Discord server specific
  serverId: text("server_id").notNull(),
});

// Bloodlines table
export const bloodlines = pgTable("bloodlines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  rarity: rarityEnum("rarity").notNull(),
  description: text("description"),
  powerBonus: integer("power_bonus").notNull().default(0),
  defenseBonus: integer("defense_bonus").notNull().default(0),
  agilityBonus: integer("agility_bonus").notNull().default(0),
  wisdomBonus: integer("wisdom_bonus").notNull().default(0),
  specialAbilities: jsonb("special_abilities"),
  icon: text("icon"),
});

// Factions table
export const factions = pgTable("factions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  leaderId: integer("leader_id"),
  warPoints: integer("war_points").notNull().default(0),
  memberCount: integer("member_count").notNull().default(0),
  icon: text("icon"),
  serverId: text("server_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Items table
export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: itemTypeEnum("type").notNull(),
  rarity: rarityEnum("rarity").notNull(),
  description: text("description"),
  powerBonus: integer("power_bonus").notNull().default(0),
  defenseBonus: integer("defense_bonus").notNull().default(0),
  agilityBonus: integer("agility_bonus").notNull().default(0),
  wisdomBonus: integer("wisdom_bonus").notNull().default(0),
  price: integer("price").notNull().default(0),
  icon: text("icon"),
  specialEffects: jsonb("special_effects"),
});

// User inventory
export const userItems = pgTable("user_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  itemId: integer("item_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  isEquipped: boolean("is_equipped").notNull().default(false),
  acquiredAt: timestamp("acquired_at").defaultNow(),
});

// Missions table
export const missions = pgTable("missions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: missionTypeEnum("type").notNull(),
  requirements: jsonb("requirements"),
  rewards: jsonb("rewards"),
  xpReward: integer("xp_reward").notNull().default(0),
  crystalReward: integer("crystal_reward").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  serverId: text("server_id").notNull(),
});

// User missions progress
export const userMissions = pgTable("user_missions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  missionId: integer("mission_id").notNull(),
  status: missionStatusEnum("status").notNull().default("active"),
  progress: jsonb("progress"),
  assignedAt: timestamp("assigned_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"),
});

// Battle logs
export const battles = pgTable("battles", {
  id: serial("id").primaryKey(),
  attacker: integer("attacker_id").notNull(),
  defender: integer("defender_id").notNull(),
  type: battleTypeEnum("type").notNull(),
  result: battleResultEnum("result").notNull(),
  narrative: text("narrative"),
  xpGained: integer("xp_gained").notNull().default(0),
  crystalsGained: integer("crystals_gained").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  serverId: text("server_id").notNull(),
});

// Activity logs
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  serverId: text("server_id").notNull(),
});

// Server settings
export const serverSettings = pgTable("server_settings", {
  id: serial("id").primaryKey(),
  serverId: text("server_id").notNull().unique(),
  sectMasterId: text("sect_master_id"),
  welcomeChannelId: text("welcome_channel_id"),
  generalChannelId: text("general_channel_id"),
  cultivationChannelId: text("cultivation_channel_id"),
  battleChannelId: text("battle_channel_id"),
  factionChannelId: text("faction_channel_id"),
  xpMultiplier: decimal("xp_multiplier").notNull().default("1.0"),
  premiumEnabled: boolean("premium_enabled").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const userRelations = relations(users, ({ one, many }) => ({
  bloodline: one(bloodlines, {
    fields: [users.bloodlineId],
    references: [bloodlines.id],
  }),
  faction: one(factions, {
    fields: [users.factionId],
    references: [factions.id],
  }),
  items: many(userItems),
  missions: many(userMissions),
  battlesAsAttacker: many(battles, { relationName: "attacker" }),
  battlesAsDefender: many(battles, { relationName: "defender" }),
  activities: many(activities),
}));

export const bloodlineRelations = relations(bloodlines, ({ many }) => ({
  users: many(users),
}));

export const factionRelations = relations(factions, ({ one, many }) => ({
  leader: one(users, {
    fields: [factions.leaderId],
    references: [users.id],
  }),
  members: many(users),
}));

export const itemRelations = relations(items, ({ many }) => ({
  userItems: many(userItems),
}));

export const userItemRelations = relations(userItems, ({ one }) => ({
  user: one(users, {
    fields: [userItems.userId],
    references: [users.id],
  }),
  item: one(items, {
    fields: [userItems.itemId],
    references: [items.id],
  }),
}));

export const missionRelations = relations(missions, ({ many }) => ({
  userMissions: many(userMissions),
}));

export const userMissionRelations = relations(userMissions, ({ one }) => ({
  user: one(users, {
    fields: [userMissions.userId],
    references: [users.id],
  }),
  mission: one(missions, {
    fields: [userMissions.missionId],
    references: [missions.id],
  }),
}));

export const battleRelations = relations(battles, ({ one }) => ({
  attackerUser: one(users, {
    fields: [battles.attacker],
    references: [users.id],
    relationName: "attacker",
  }),
  defenderUser: one(users, {
    fields: [battles.defender],
    references: [users.id],
    relationName: "defender",
  }),
}));

export const activityRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastActive: true,
});

export const insertBloodlineSchema = createInsertSchema(bloodlines).omit({
  id: true,
});

export const insertFactionSchema = createInsertSchema(factions).omit({
  id: true,
  createdAt: true,
  memberCount: true,
});

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
});

export const insertMissionSchema = createInsertSchema(missions).omit({
  id: true,
});

export const insertBattleSchema = createInsertSchema(battles).omit({
  id: true,
  createdAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertServerSettingsSchema = createInsertSchema(serverSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Bloodline = typeof bloodlines.$inferSelect;
export type InsertBloodline = z.infer<typeof insertBloodlineSchema>;
export type Faction = typeof factions.$inferSelect;
export type InsertFaction = z.infer<typeof insertFactionSchema>;
export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type UserItem = typeof userItems.$inferSelect;
export type Mission = typeof missions.$inferSelect;
export type InsertMission = z.infer<typeof insertMissionSchema>;
export type UserMission = typeof userMissions.$inferSelect;
export type Battle = typeof battles.$inferSelect;
export type InsertBattle = z.infer<typeof insertBattleSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type ServerSettings = typeof serverSettings.$inferSelect;
export type InsertServerSettings = z.infer<typeof insertServerSettingsSchema>;
