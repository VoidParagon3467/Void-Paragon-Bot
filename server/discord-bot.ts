import * as dotenv from "dotenv";
dotenv.config();
import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} from "discord.js";
import { storage } from "./storage";
import { cultivationRealms, rankHierarchy } from "@shared/schema";
import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
let openai: any = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
  console.warn("⚠️ OPENAI_API_KEY not set. AI features (DM chat, smart games) disabled. Bot will run with core features only.");
}

export class CultivationBot {
  private client: Client;
  private readonly TOKEN = process.env.DISCORD_TOKEN;
  private logThreadMap: Map<string, string> = new Map(); // Map of serverId to thread ID
  private activeEvents: Map<string, number> = new Map(); // Track count of simultaneous events per server (max 3)
  private conversationHistories: Map<string, Array<{ role: string; content: string }>> = new Map(); // DM conversation histories
  private activeGames: Map<string, any> = new Map(); // Track active games

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
      ],
    });

    this.setupEventHandlers();
    this.setupCommands();
  }

  // Public getter for client (needed for routes)
  get getClient(): Client {
    return this.client;
  }

  // Comprehensive bot logging system
  private async logBotEvent(serverId: string, category: string, message: string, details?: any) {
    try {
      let settings;
      try {
        settings = await storage.getServerSettings(serverId);
      } catch (e: any) {
        // Gracefully handle missing columns during migration
        if (e.code === '42703' || e.message?.includes('does not exist')) {
          return; // Skip logging if columns don't exist yet
        }
        throw e;
      }
      if (!settings?.botLogsChannelId) return; // No logs channel configured

      const guild = this.client.guilds.cache.get(serverId);
      if (!guild) return;

      const channel = guild.channels.cache.get(settings.botLogsChannelId) as any;
      if (!channel || !('send' in channel)) return;

      // Check if user is sect master
      const sectMasterId = settings.sectMasterId;
      if (!sectMasterId) return; // No sect master set

      // Permission check: only visible to sect master
      await channel.permissionOverwrites.edit(sectMasterId, {
        ViewChannel: true,
        ReadMessageHistory: true,
      }).catch(() => {});

      // Format the log message
      const timestamp = new Date().toLocaleTimeString();
      const logContent = details 
        ? `[${timestamp}] ${message}\n\`\`\`json\n${JSON.stringify(details, null, 2)}\n\`\`\`` 
        : `[${timestamp}] ${message}`;

      // Create or get thread for this category
      let threadId = this.logThreadMap.get(`${serverId}_${category}`);
      let thread;

      if (threadId) {
        thread = await channel.threads.fetch(threadId).catch(() => null);
      }

      if (!thread) {
        // Create new thread for this category
        const mainMessage = await channel.send({
          content: `🔹 **${category}** LOG THREAD\n*Auto-updating logs for ${category} events*`,
        });
        thread = await mainMessage.startThread({
          name: `${category}-logs`,
          autoArchiveDuration: 10080, // 7 days
        });
        threadId = thread.id;
        this.logThreadMap.set(`${serverId}_${category}`, threadId);
      }

      // Send log to thread
      if (logContent.length > 2000) {
        // Split long messages
        const chunks = logContent.match(/[\s\S]{1,1990}/g) || [];
        for (const chunk of chunks) {
          await thread.send(chunk).catch(console.error);
        }
      } else {
        await thread.send(logContent).catch(console.error);
      }
    } catch (error) {
      console.error("Error logging bot event:", error);
    }
  }

  private setupEventHandlers() {
    this.client.on("ready", () => {
      console.log(`✅ Bot is ready! Logged in as ${this.client.user?.tag}`);
      this.startAutomaticSystems();
    });

    this.client.on("guildMemberAdd", async (member) => {
      const logMsg = `👤 New member joined: ${member.user.tag}`;
      console.log(logMsg);
      await this.logBotEvent(member.guild.id, "Members", logMsg, {
        member: member.user.tag,
        memberId: member.id,
        joinedAt: new Date().toISOString(),
      });
      await this.handleNewMember(member);
    });

    this.client.on("messageCreate", async (message) => {
      if (message.author.bot) return;
      
      // Handle DM conversations with the bot
      if (message.isDMChannel()) {
        await this.handleDMConversation(message);
        return;
      }

      const logMsg = `💬 Message from ${message.author.tag}: "${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}"`;
      // Only log important messages, not all to avoid spam
      if (message.mentions.has(this.client.user?.id || '')) {
        await this.logBotEvent(message.guildId || '', "Messages", logMsg, {
          author: message.author.tag,
          authorId: message.author.id,
          content: message.content,
          mentions: message.mentions.map(u => u.tag),
        });
      }
      // Check for rule violations (moderation)
      await this.checkModerationRules(message);
      // Check for conversation topics when silent
      await this.generateConversationTopicIfNeeded(message);
      await this.handleChatXp(message);
    });

    this.client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      const logMsg = `🎮 Executing: ${interaction.commandName} by ${interaction.user.tag}`;
      console.log(logMsg);
      const serverId = interaction.guildId;
      if (serverId) {
        await this.logBotEvent(serverId, "Commands", logMsg, {
          command: interaction.commandName,
          user: interaction.user.tag,
          userId: interaction.user.id,
          timestamp: new Date().toISOString(),
        });
      }
      await this.handleSlashCommand(interaction);
    });

    this.client.on("error", (error) => {
      console.error("❌ Discord client error:", error);
    });
  }

  private startAutomaticSystems() {
    console.log("🔄 Starting automatic systems...");
    
    // Daily resources distribution - every 24 hours
    setInterval(() => this.distributeDailyResources(), 24 * 60 * 60 * 1000);
    
    // Hall of Fame leaderboards - daily
    setInterval(() => this.postHallOfFameLeaderboards(), 24 * 60 * 60 * 1000);
    
    // Premium Rewards posting - daily showcase
    setInterval(() => this.postPremiumRewards(), 24 * 60 * 60 * 1000);
    
    // Auto-generate treasures every 6 hours
    setInterval(() => this.autoGenerateTreasures(), 6 * 60 * 60 * 1000);
    
    // Divine bodies every 18 hours
    setInterval(() => this.autoGenerateDivineBodies(), 18 * 60 * 60 * 1000);
    
    // Daos every 24 hours
    setInterval(() => this.autoGenerateDaos(), 24 * 60 * 60 * 1000);
    
    // Titles every 12 hours
    setInterval(() => this.autoGenerateTitles(), 12 * 60 * 60 * 1000);
    
    // Weapons every 8 hours
    setInterval(() => this.autoGenerateWeapons(), 8 * 60 * 60 * 1000);
    
    // Breakthrough treasures (ultra-rare, frequency varies)
    setInterval(() => this.autoGenerateBreakthroughTreasures(), 2 * 60 * 60 * 1000);
    
    // Bloodline generation for premium users every 12 hours
    setInterval(() => this.autoGenerateBloodlines(), 12 * 60 * 60 * 1000);
    
    // Random events every 4 hours
    setInterval(() => this.triggerRandomEvent(), 4 * 60 * 60 * 1000);
    
    // Void Sect Defense events every 6 hours (alien attacks)
    setInterval(() => this.triggerVoidSectDefense(), 6 * 60 * 60 * 1000);
    
    // Daily activity reporting
    setInterval(() => this.reportDailyActivity(), 24 * 60 * 60 * 1000);
    
    // Meditation XP gain every 1 minute
    setInterval(() => this.distributeMeditationXp(), 60 * 1000);

    // Also run these immediately on startup
    this.distributeDailyResources().catch(console.error);
    this.autoGenerateTreasures().catch(console.error);
    this.autoGenerateDivineBodies().catch(console.error);
    this.autoGenerateDaos().catch(console.error);
    this.autoGenerateTitles().catch(console.error);
    this.autoGenerateWeapons().catch(console.error);
    this.autoGenerateBloodlines().catch(console.error);
    this.postHallOfFameLeaderboards().catch(console.error);
    this.postPremiumRewards().catch(console.error);
  }

  private async postPremiumRewards() {
    try {
      console.log("💎 Posting daily premium rewards showcase...");
      const guilds = Array.from(this.client.guilds.cache.entries());
      
      const premiumItems = [
        { name: "Common Bloodline", rarity: "Common", price: "$3", desc: "A foundational bloodline for beginners" },
        { name: "Uncommon Divine Body", rarity: "Uncommon", price: "$5", desc: "An uncommon divine body with moderate power" },
        { name: "Rare Weapon", rarity: "Rare", price: "$7", desc: "A rare weapon forged by ancient masters" },
        { name: "Epic Dao", rarity: "Epic", price: "$10", desc: "Comprehend powerful principles of cultivation" },
        { name: "Legendary Bloodline", rarity: "Legendary", price: "$20", desc: "A legendary bloodline with immense power boost" },
        { name: "Mythical Divine Body", rarity: "Mythical", price: "$30", desc: "The rarest divine body - granting godlike power" }
      ];
      
      for (const [serverId] of guilds) {
        const channels = this.client.guilds.cache.get(serverId)?.channels.cache;
        if (!channels) continue;
        
        let premiumChannel = channels.find((c: any) => c.name === "premium-rewards" || c.name === "premium") as any;
        if (!premiumChannel) {
          premiumChannel = channels.find((c: any) => c.name === "announcements" || c.name === "general") as any;
        }
        
        if (premiumChannel && 'send' in premiumChannel) {
          const randomItems = premiumItems.sort(() => 0.5 - Math.random()).slice(0, 3);
          
          const embed = new EmbedBuilder()
            .setTitle("💎 PREMIUM REWARDS - Legendary Items")
            .setDescription("Unlock exclusive premium items to accelerate your cultivation!\n*All purchases processed securely via payment provider*")
            .setColor(0xff00ff)
            .addFields(
              ...randomItems.map(item => ({
                name: `⭐ ${item.name} (${item.rarity})`,
                value: `${item.desc}\n💷 **${item.price} GBP**\n*Type /premium to purchase*`,
                inline: false
              }))
            )
            .addFields({
              name: "🔐 Payment Info",
              value: "Secure payments via payment processor\nAccount: hajara kana suleiman\nBank: Clear Junction Limited\n💳 Prices: $3 (Common) → $10 (Epic) → $30 (Mythical)\n*Connect your Stripe/PayPal account to enable purchases*",
              inline: false
            })
            .setTimestamp();
          
          await premiumChannel.send({ embeds: [embed] }).catch(console.error);
        }
      }
      console.log("✅ Premium rewards posted");
    } catch (error) {
      console.error("Error posting premium rewards:", error);
    }
  }

  private async distributeDailyResources() {
    try {
      const logMsg = "📦 Distributing daily resources by rank...";
      console.log(logMsg);
      const guilds = Array.from(this.client.guilds.cache.entries());

      for (const [serverId] of guilds) {
        await this.logBotEvent(serverId, "Systems", logMsg);
        const users = await storage.getUsersInServer(serverId);

        for (const userRecord of users) {
          // Skip supreme sect master - they already have infinite
          if (userRecord.isSupremeSectMaster) continue;
          
          // Rank-based VC multiplier - ONLY Void Crystals as daily reward
          const rankInfo = rankHierarchy[userRecord.rank as keyof typeof rankHierarchy] || rankHierarchy["Outer Disciple"];
          const baseReward = 10 * userRecord.level;
          const voidCrystalsReward = Math.floor(baseReward * rankInfo.multiplier);
          
          await storage.updateUser(userRecord.id, {
            voidCrystals: userRecord.voidCrystals + voidCrystalsReward,
          } as any);
        }

        // Announce in ANNOUNCEMENT channel specifically
        const channels = this.client.guilds.cache.get(serverId)?.channels.cache;
        if (channels) {
          let announcementChannel = channels.find((c: any) => c.name === "announcements" || c.name === "announcement") as any;
          if (!announcementChannel) {
            announcementChannel = channels.find((c: any) => c.name === "general") as any;
          }
          
          if (announcementChannel && 'send' in announcementChannel) {
            const embed = new EmbedBuilder()
              .setTitle("🌅 Daily Resources Distributed!")
              .setDescription(`All cultivators have received their daily resources based on rank!`)
              .setColor(0x00ff88)
              .addFields({
                name: "Daily Rewards (Rank-Based VC Multiplier)",
                value: `💎 Base: 10 × Level Void Crystals\n🏆 Multiplied by Rank (Outer Disciple: 1x, Heavenly Elder: 8x, Supreme Sect Master: 100x)\n\n⚠️ Sect Points and Karma are earned only through events and treasures!\n✨ Save your VC to purchase treasures!`,
              })
              .setTimestamp();

            await (announcementChannel as any).send({ embeds: [embed] }).catch(console.error);
          }
        }
      }
    } catch (error) {
      console.error("Error distributing daily resources:", error);
    }
  }

  private async autoGenerateTreasures() {
    try {
      const logMsg = "✨ Auto-generating treasures with tiered pricing...";
      console.log(logMsg);
      const guilds = Array.from(this.client.guilds.cache.entries());
      for (const [serverId] of guilds) {
        await this.logBotEvent(serverId, "ItemGeneration", logMsg);
      }
      const treasureNames = [
        "Spirit Stone", "Heaven Pill", "Void Shard", "Dragon Scale", "Phoenix Feather",
        "Celestial Pearl", "Demon Blood", "God Core", "Infinite Jade", "Soul Essence",
      ];

      // Generate mostly lower rarity, rarely epics/legendaries
      const generatedTreasures = [];
      
      // Weighted rarity: 40% common, 35% uncommon, 15% rare, 8% epic, 2% legendary
      const rarity = Math.random() > 0.98 ? "legendary" : 
                     Math.random() > 0.90 ? "epic" :
                     Math.random() > 0.75 ? "rare" :
                     Math.random() > 0.40 ? "uncommon" : "common";

      const name = treasureNames[Math.floor(Math.random() * treasureNames.length)];

      // TIERED PRICING SYSTEM
      let price = 0;
      let priceDescription = "";
      
      if (rarity === "common") {
        price = Math.floor(Math.random() * 200) + 100; // 100-300 VC
        priceDescription = `${price} Void Crystals`;
      } else if (rarity === "uncommon") {
        price = Math.floor(Math.random() * 150) + 150; // 150-300 VC
        priceDescription = `${price} Void Crystals`;
      } else if (rarity === "rare") {
        const vcCost = 300 + Math.floor(Math.random() * 200);
        const spCost = 5 + Math.floor(Math.random() * 5);
        price = vcCost;
        priceDescription = `${vcCost} VC + ${spCost} Sect Points`;
      } else if (rarity === "epic") {
        const karmaCost = 2 + Math.floor(Math.random() * 2); // 2-3 Karma
        price = karmaCost * 1000; // Store karma cost as multiplier for DB compatibility
        priceDescription = `${karmaCost} Karma (Exceedingly Rare!)`;
      } else { // legendary
        const karmaCost = 3 + Math.floor(Math.random() * 2); // 3-4 Karma
        price = karmaCost * 1000;
        priceDescription = `${karmaCost} Karma (Legendary Power!)`;
      }

      const specialEffects = {
        rarity,
        priceType: rarity === "common" || rarity === "uncommon" ? "vc" : 
                  rarity === "rare" ? "vc_sp" : "karma",
        actualPrice: price,
        priceString: priceDescription,
      };

      const item = await storage.createItem({
        name: `${name}`,
        type: "treasure",
        rarity,
        description: `A ${rarity} treasure imbued with ancient power`,
        price,
        powerBonus: rarity === "legendary" ? 150 : rarity === "epic" ? 100 : rarity === "rare" ? 50 : rarity === "uncommon" ? 25 : 10,
        defenseBonus: rarity === "legendary" ? 100 : rarity === "epic" ? 70 : rarity === "rare" ? 30 : rarity === "uncommon" ? 15 : 5,
        agilityBonus: rarity === "legendary" ? 80 : rarity === "epic" ? 50 : rarity === "rare" ? 20 : rarity === "uncommon" ? 10 : 5,
        wisdomBonus: rarity === "legendary" ? 120 : rarity === "epic" ? 80 : rarity === "rare" ? 25 : rarity === "uncommon" ? 12 : 5,
        specialEffects: specialEffects as any,
      } as any);

      generatedTreasures.push(item);

      // Announce epic/legendary treasures (the rare ones that need special currency)
      if (rarity === "epic" || rarity === "legendary") {
        const guilds = Array.from(this.client.guilds.cache.entries());
        for (const [serverId] of guilds) {
          const channels = this.client.guilds.cache.get(serverId)?.channels.cache;
          if (channels) {
            let targetChannel = channels.find((c: any) => c.name === "announcements" && c.isTextBased()) as any;
            if (!targetChannel) {
              targetChannel = channels.find((c: any) => c.isTextBased()) as any;
            }

            if (targetChannel && 'send' in targetChannel) {
              const embed = new EmbedBuilder()
                .setTitle(`🏆 ${rarity === "legendary" ? "LEGENDARY" : "EPIC"} TREASURE ALERT!`)
                .setDescription(`A magnificent treasure has appeared in the void!`)
                .setColor(rarity === "legendary" ? 0xffd700 : 0xff6600)
                .addFields(
                  { name: "Treasure", value: item.name, inline: false },
                  { name: "Rarity", value: `✨ ${rarity.toUpperCase()} ✨`, inline: true },
                  { name: "Cost", value: priceDescription, inline: true },
                  {
                    name: "Bonuses",
                    value: `⚔️ Power +${item.powerBonus} | 🛡️ Defense +${item.defenseBonus}\n🏃 Agility +${item.agilityBonus} | 🧠 Wisdom +${item.wisdomBonus}`,
                    inline: false,
                  }
                )
                .setTimestamp();

              await (targetChannel as any).send({ embeds: [embed] }).catch(console.error);
            }
          }
        }
      }

      console.log(`✨ Generated ${rarity.toUpperCase()} treasure: ${name}`);
    } catch (error) {
      console.error("Error generating treasures:", error);
    }
  }

  private async autoGenerateDivineBodies() {
    try {
      console.log("✨ Generating divine bodies...");
      const bodyNames = ["Immortal Phoenix", "Void Dragon", "Celestial Tiger", "Divine Crane", "Demonic Ape", "Star Beast"];
      const rarities = ["uncommon", "rare", "epic", "legendary"];
      
      const name = bodyNames[Math.floor(Math.random() * bodyNames.length)];
      const rarity = rarities[Math.floor(Math.random() * (rarities.length - 1))];
      const minRealmIndex = Math.floor(Math.random() * 15);
      
      await storage.createDivineBody({
        name,
        rarity,
        description: `A ${rarity} divine body granting immense power`,
        minRealmIndex,
        powerBonus: rarity === "legendary" ? 300 : rarity === "epic" ? 200 : rarity === "rare" ? 100 : 50,
        defenseBonus: rarity === "legendary" ? 200 : rarity === "epic" ? 150 : rarity === "rare" ? 75 : 30,
        agilityBonus: rarity === "legendary" ? 150 : rarity === "epic" ? 100 : rarity === "rare" ? 50 : 25,
        wisdomBonus: rarity === "legendary" ? 250 : rarity === "epic" ? 175 : rarity === "rare" ? 100 : 50,
        price: rarity === "legendary" ? 10000 : rarity === "epic" ? 5000 : rarity === "rare" ? 2000 : 500,
      } as any);
      console.log(`✨ Generated ${rarity.toUpperCase()} divine body: ${name}`);
    } catch (error) {
      console.error("Error generating divine bodies:", error);
    }
  }

  private async autoGenerateDaos() {
    try {
      console.log("☯️ Generating daos...");
      const daoNames = ["Dao of Void", "Dao of Heaven", "Dao of Desolation", "Dao of Eternity", "Dao of Chaos"];
      const rarities = ["uncommon", "rare", "epic", "legendary"];
      
      const name = daoNames[Math.floor(Math.random() * daoNames.length)];
      const rarity = rarities[Math.floor(Math.random() * (rarities.length - 1))];
      const minRealmIndex = Math.floor(Math.random() * 18);
      
      await storage.createDao({
        name,
        rarity,
        description: `A ${rarity} dao granting wisdom and power`,
        minRealmIndex,
        wisdomBonus: rarity === "legendary" ? 400 : rarity === "epic" ? 250 : rarity === "rare" ? 150 : 75,
        price: rarity === "legendary" ? 8000 : rarity === "epic" ? 4000 : rarity === "rare" ? 1500 : 400,
      } as any);
      console.log(`☯️ Generated ${rarity.toUpperCase()} dao: ${name}`);
    } catch (error) {
      console.error("Error generating daos:", error);
    }
  }

  private async autoGenerateTitles() {
    try {
      console.log("👑 Generating titles...");
      const titleNames = ["Void Sovereign", "Heaven's Child", "Immortal Ascendant", "Eternal Wanderer", "Chaos Bringer"];
      
      const name = titleNames[Math.floor(Math.random() * titleNames.length)];
      const minRealmIndex = Math.floor(Math.random() * 20);
      
      await storage.createTitle({
        name,
        description: `A prestigious title: ${name}`,
        minRealmIndex,
        powerBonus: 50,
        defenseBonus: 50,
        wisdomBonus: 75,
        price: 2000,
      } as any);
      console.log(`👑 Generated title: ${name}`);
    } catch (error) {
      console.error("Error generating titles:", error);
    }
  }

  private async autoGenerateWeapons() {
    try {
      console.log("⚔️ Generating weapons...");
      const weaponNames = ["Void Blade", "Heaven's Edge", "Eternal Staff", "Divine Fist", "Spirit Sword"];
      const rarities = ["uncommon", "rare", "epic", "legendary"];
      const weaponTypes = ["sword", "staff", "fist", "blade", "bow"];
      
      const name = weaponNames[Math.floor(Math.random() * weaponNames.length)];
      const rarity = rarities[Math.floor(Math.random() * (rarities.length - 1))];
      const weaponType = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
      const minRealmIndex = Math.floor(Math.random() * 15);
      
      await storage.createWeapon({
        name,
        rarity,
        description: `A ${rarity} ${weaponType}`,
        minRealmIndex,
        weaponType,
        offenseBonus: rarity === "legendary" ? 400 : rarity === "epic" ? 250 : rarity === "rare" ? 150 : 75,
        defenseBonus: rarity === "legendary" ? 200 : rarity === "epic" ? 125 : rarity === "rare" ? 75 : 40,
        price: rarity === "legendary" ? 9000 : rarity === "epic" ? 4500 : rarity === "rare" ? 1800 : 450,
      } as any);
      console.log(`⚔️ Generated ${rarity.toUpperCase()} weapon: ${name}`);
    } catch (error) {
      console.error("Error generating weapons:", error);
    }
  }

  private async autoGenerateBreakthroughTreasures() {
    try {
      console.log("💎 Checking for breakthrough treasure appearances...");
      const treasureNames = ["Divine Ginseng", "Immortal Fruit", "Heaven Elixir", "Void Pill", "Celestial Core"];
      const treasures = [
        { name: "Divine Ginseng", maxRealm: 12, levels: 2, vc: 0, sp: 0, karma: 5, freq: 90 },
        { name: "Immortal Fruit", maxRealm: 15, levels: 1, vc: 5000, sp: 100, karma: 0, freq: 60 },
        { name: "Heaven Elixir", maxRealm: 20, levels: 1, vc: 0, sp: 0, karma: 8, freq: 120 },
      ];
      
      const treasure = treasures[Math.floor(Math.random() * treasures.length)];
      
      // Only create if it should appear based on frequency
      if (Math.random() > 0.5) {
        await storage.createBreakthroughTreasure({
          name: treasure.name,
          rarity: "legendary",
          description: `A legendary breakthrough treasure - raises level by ${treasure.levels}`,
          maxRealmIndex: treasure.maxRealm,
          levelGain: treasure.levels,
          priceVc: treasure.vc,
          priceSp: treasure.sp,
          priceKarma: treasure.karma,
          appearanceFrequencyDays: treasure.freq,
          lastAppearedAt: new Date(),
        });
        console.log(`💎 Breakthrough treasure appeared: ${treasure.name} (Max Realm: ${treasure.maxRealm})`);
      }
    } catch (error) {
      console.error("Error generating breakthrough treasures:", error);
    }
  }

  private async postHallOfFameLeaderboards() {
    try {
      console.log("🏆 Posting Hall of Fame leaderboards...");
      const guilds = Array.from(this.client.guilds.cache.entries());
      
      for (const [serverId] of guilds) {
        const users = await storage.getUsersInServer(serverId);
        
        // DISCIPLES tier: Outer, Inner, Core, Inheritor (exclude Sect Master and Elders)
        const discipleLevels = ["Outer Disciple", "Inner Disciple", "Core Disciple", "Inheritor Disciple"];
        const disciples = users.filter(u => 
          discipleLevels.includes(u.rank || "Outer Disciple") && !u.isSupremeSectMaster
        );
        
        // ELDERS tier: Heavenly Elder, Great Elder, Elder (no Sect Master)
        const elderLevels = ["Heavenly Elder", "Great Elder", "Elder"];
        const elders = users.filter(u => 
          elderLevels.includes(u.rank || "") && !u.isSupremeSectMaster
        );
        
        // Create top 10 leaderboards for each tier
        const discipleVCTop10 = disciples.sort((a, b) => b.voidCrystals - a.voidCrystals).slice(0, 10);
        const discipleSPTop10 = disciples.sort((a, b) => b.sectPoints - a.sectPoints).slice(0, 10);
        const discipleKarmaTop10 = disciples.sort((a, b) => b.karma - a.karma).slice(0, 10);
        
        const elderVCTop10 = elders.sort((a, b) => b.voidCrystals - a.voidCrystals).slice(0, 10);
        const elderSPTop10 = elders.sort((a, b) => b.sectPoints - a.sectPoints).slice(0, 10);
        const elderKarmaTop10 = elders.sort((a, b) => b.karma - a.karma).slice(0, 10);
        
        const channels = this.client.guilds.cache.get(serverId)?.channels.cache;
        if (!channels) continue;
        
        let hallOfFameChannel = channels.find((c: any) => c.name === "hall-of-fame" || c.name === "sect-hall-of-fame") as any;
        if (!hallOfFameChannel) {
          hallOfFameChannel = channels.find((c: any) => c.isTextBased()) as any;
        }
        
        if (hallOfFameChannel && 'send' in hallOfFameChannel) {
          // DISCIPLES LEADERBOARD
          const discipleEmbed = new EmbedBuilder()
            .setTitle("🏆 DISCIPLES HALL OF FAME - Top 10")
            .setColor(0xffd700)
            .addFields(
              {
                name: "💎 Void Crystals",
                value: discipleVCTop10.map((u, i) => `${i + 1}. ${u.username}: ${u.voidCrystals}`).join("\n") || "No records",
                inline: true,
              },
              {
                name: "📖 Sect Points",
                value: discipleSPTop10.map((u, i) => `${i + 1}. ${u.username}: ${u.sectPoints}`).join("\n") || "No records",
                inline: true,
              },
              {
                name: "✅ Karma",
                value: discipleKarmaTop10.map((u, i) => `${i + 1}. ${u.username}: ${u.karma}`).join("\n") || "No records",
                inline: true,
              }
            )
            .setTimestamp();
          
          await hallOfFameChannel.send({ embeds: [discipleEmbed] }).catch(console.error);
          
          // ELDERS LEADERBOARD
          if (elders.length > 0) {
            const elderEmbed = new EmbedBuilder()
              .setTitle("👑 ELDERS HALL OF FAME - Top 10")
              .setColor(0xaa00ff)
              .addFields(
                {
                  name: "💎 Void Crystals",
                  value: elderVCTop10.map((u, i) => `${i + 1}. ${u.username}: ${u.voidCrystals}`).join("\n") || "No records",
                  inline: true,
                },
                {
                  name: "📖 Sect Points",
                  value: elderSPTop10.map((u, i) => `${i + 1}. ${u.username}: ${u.sectPoints}`).join("\n") || "No records",
                  inline: true,
                },
                {
                  name: "✅ Karma",
                  value: elderKarmaTop10.map((u, i) => `${i + 1}. ${u.username}: ${u.karma}`).join("\n") || "No records",
                  inline: true,
                }
              )
              .setTimestamp();
            
            await hallOfFameChannel.send({ embeds: [elderEmbed] }).catch(console.error);
          }
        }
      }
      console.log("✅ Hall of Fame leaderboards posted");
    } catch (error) {
      console.error("Error posting hall of fame:", error);
    }
  }

  private async createDailyEvent() {
    try {
      console.log("🎲 Creating daily mini events...");
      const eventNames = [
        "Trial of Strength",
        "Wisdom Challenge",
        "Void Hunt",
        "Celestial Race",
        "Artifact Gathering",
      ];
      
      const guilds = Array.from(this.client.guilds.cache.entries());
      
      for (const [serverId] of guilds) {
        const eventName = eventNames[Math.floor(Math.random() * eventNames.length)];
        const now = new Date();
        const endsIn24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        
        await storage.createEvent({
          serverId,
          type: "daily",
          title: eventName,
          description: `A daily ${eventName} challenge for all disciples!`,
          entryCost: 0, // Free daily
          entryCostType: "vc",
          maxParticipants: 1000,
          winnerCount: 10,
          rewardPool: {
            vc: Math.floor(Math.random() * 500) + 500, // 500-1000 VC to distribute
            sp: Math.floor(Math.random() * 50) + 25, // 25-75 SP
            bloodlines: 1,
            weapons: 1,
          },
          startedAt: now,
          endsAt: endsIn24h,
        } as any);
        
        // Post to mini events channel
        const channels = this.client.guilds.cache.get(serverId)?.channels.cache;
        if (channels) {
          let eventChannel = channels.find((c: any) => c.name === "mini-events" || c.name === "events") as any;
          if (!eventChannel) {
            eventChannel = channels.find((c: any) => c.isTextBased()) as any;
          }
          
          if (eventChannel && 'send' in eventChannel) {
            const embed = new EmbedBuilder()
              .setTitle(`⚔️ ${eventName}`)
              .setDescription("A new daily event has begun!")
              .setColor(0xff6600)
              .addFields(
                { name: "Duration", value: "24 hours", inline: true },
                { name: "Entry Cost", value: "Free", inline: true },
                { name: "Rewards", value: "Void Crystals, Sect Points, Rare Items", inline: true },
                { name: "Top Rewards", value: "Top 10 get bonus Legendary Weapons + Bloodlines!", inline: false }
              )
              .setTimestamp();
            
            await eventChannel.send({ embeds: [embed] }).catch(console.error);
          }
        }
      }
      console.log("✅ Daily events created");
    } catch (error) {
      console.error("Error creating daily events:", error);
    }
  }

  private async autoGenerateBloodlines() {
    try {
      console.log("🩸 Auto-generating bloodlines for premium users...");
      const bloodlineNames = [
        "Phoenix Bloodline",
        "Dragon Bloodline",
        "Demon Bloodline",
        "Angel Bloodline",
        "God Bloodline",
        "Void Bloodline",
        "Celestial Bloodline",
        "Primordial Bloodline",
      ];

      const guilds = Array.from(this.client.guilds.cache.entries());
      for (const [serverId] of guilds) {
        const users = await storage.getUsersInServer(serverId);

        // For demonstration, mark users with 3+ rebirths as "premium"
        for (const user of users) {
          if (user.rebirthCount >= 3 && !user.bloodlineId) {
            const bloodlineName = bloodlineNames[Math.floor(Math.random() * bloodlineNames.length)];
            const bloodline = await storage.createBloodline({
              name: bloodlineName,
              description: `A powerful ${bloodlineName} awakens within you!`,
              powerBonus: Math.floor(Math.random() * 100) + 50,
              defenseBonus: Math.floor(Math.random() * 50) + 25,
              wisdomBonus: Math.floor(Math.random() * 75) + 25,
              agilityBonus: Math.floor(Math.random() * 50) + 25,
            } as any);

            await storage.updateUser(user.id, {
              bloodlineId: bloodline.id,
            } as any);

            // Announce to user
            try {
              const discordUser = await this.client.users.fetch(user.discordId);
              const embed = new EmbedBuilder()
                .setTitle("🩸 BLOODLINE AWAKENING!")
                .setDescription(`You have awakened a ${bloodlineName}!`)
                .setColor(0xff0000)
                .addFields(
                  { name: "Bloodline", value: bloodlineName, inline: false },
                  { name: "Power Bonus", value: `+${bloodline.powerBonus}`, inline: true },
                  { name: "Defense Bonus", value: `+${bloodline.defenseBonus}`, inline: true }
                )
                .setTimestamp();

              await discordUser.send({ embeds: [embed] }).catch(console.error);
            } catch (error) {
              console.error("Error sending DM:", error);
            }
          }
        }
      }

      console.log("✅ Bloodline generation complete");
    } catch (error) {
      console.error("Error generating bloodlines:", error);
    }
  }

  private async triggerRandomEvent() {
    try {
      console.log("🎲 Triggering random event...");
      const events = [
        {
          type: "meteor_shower",
          name: "🌠 Meteor Shower",
          message:
            "Meteors rain down from the heavens! All cultivators gain 2x void crystals for the next hour!",
          reward: "double_crystals",
        },
        {
          type: "void_rift",
          name: "🌀 Void Rift",
          message: "A void rift opens! All cultivators can breach a realm instantly!",
          reward: "free_breakthrough",
        },
        {
          type: "celestial_blessing",
          name: "⭐ Celestial Blessing",
          message: "The heavens bless you! All cultivators gain 1000 sect points!",
          reward: "sect_points",
        },
        {
          type: "fate_alignment",
          name: "🎯 Fate Alignment",
          message: "Fate aligns! All cultivators gain 100 karma points!",
          reward: "karma",
        },
      ];

      const randomEvent = events[Math.floor(Math.random() * events.length)];

      const guilds = Array.from(this.client.guilds.cache.entries());
      for (const [serverId] of guilds) {
        const channels = this.client.guilds.cache.get(serverId)?.channels.cache;
        if (channels) {
          const textChannel = channels.find((c: any) => c.isTextBased()) as any;
          if (textChannel && 'send' in textChannel) {
            const embed = new EmbedBuilder()
              .setTitle(randomEvent.name)
              .setDescription(randomEvent.message)
              .setColor(0x9966ff)
              .setTimestamp();

            await (textChannel as any).send({ embeds: [embed] }).catch(console.error);

            // Apply rewards - respecting strict currency scarcity
            const eventUsers = await storage.getUsersInServer(serverId);
            for (const eventUser of eventUsers) {
              if (eventUser.isSupremeSectMaster) continue; // Skip supreme sect master
              
              let updates: any = {};
              switch (randomEvent.reward) {
                case "double_crystals":
                  // Void Crystals are most common
                  updates.voidCrystals = eventUser.voidCrystals + (50 * eventUser.level);
                  break;
                case "sect_points":
                  // Sect Points VERY RARE - 50-100 MAX
                  updates.sectPoints = eventUser.sectPoints + (Math.floor(Math.random() * 50) + 50);
                  break;
                case "karma":
                  // Karma EXCEEDINGLY RARE - 5-10 MAX
                  updates.karma = eventUser.karma + (Math.floor(Math.random() * 5) + 5);
                  break;
              }
              if (Object.keys(updates).length > 0) {
                await storage.updateUser(eventUser.id, updates);
              }
            }
          }
        }
      }

      console.log(`✅ Event triggered: ${randomEvent.name}`);
    } catch (error) {
      console.error("Error triggering random event:", error);
    }
  }

  private async setupCommands() {
    const commands = [
      // Core Commands
      new SlashCommandBuilder()
        .setName("profile")
        .setDescription("View your cultivation profile"),

      new SlashCommandBuilder()
        .setName("cultivate")
        .setDescription("Cultivate to increase XP"),

      new SlashCommandBuilder()
        .setName("breakthrough")
        .setDescription("Attempt a breakthrough to the next realm"),

      new SlashCommandBuilder()
        .setName("stats")
        .setDescription("View detailed cultivation stats"),

      // Combat
      new SlashCommandBuilder()
        .setName("spar")
        .setDescription("Challenge another cultivator to a sparring match")
        .addUserOption((option) =>
          option
            .setName("opponent")
            .setDescription("The cultivator you want to challenge")
            .setRequired(true)
        ),

      // Faction Commands
      new SlashCommandBuilder()
        .setName("faction")
        .setDescription("Faction management")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("create")
            .setDescription("Create a new faction")
            .addStringOption((option) =>
              option
                .setName("name")
                .setDescription("Name of the faction")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("list")
            .setDescription("List all factions")
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("join")
            .setDescription("Join a faction")
            .addIntegerOption((option) =>
              option
                .setName("faction_id")
                .setDescription("Faction ID to join")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand.setName("leave").setDescription("Leave your faction")
        )
        .addSubcommand((subcommand) =>
          subcommand.setName("info").setDescription("View faction information")
        ),

      // Shop Commands
      new SlashCommandBuilder()
        .setName("shop")
        .setDescription("View the cultivation shop"),

      new SlashCommandBuilder()
        .setName("buy")
        .setDescription("Buy an item from the shop")
        .addIntegerOption((option) =>
          option
            .setName("item_id")
            .setDescription("Item ID to purchase")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("quantity")
            .setDescription("Quantity to buy (default: 1)")
            .setRequired(false)
        ),

      // Inventory
      new SlashCommandBuilder()
        .setName("inventory")
        .setDescription("View your inventory"),

      new SlashCommandBuilder()
        .setName("equip")
        .setDescription("Equip an item")
        .addIntegerOption((option) =>
          option
            .setName("item_id")
            .setDescription("Item ID to equip")
            .setRequired(true)
        ),

      // Missions
      new SlashCommandBuilder()
        .setName("missions")
        .setDescription("View your active missions"),

      new SlashCommandBuilder()
        .setName("complete_mission")
        .setDescription("Complete a mission")
        .addIntegerOption((option) =>
          option
            .setName("mission_id")
            .setDescription("Mission ID to complete")
            .setRequired(true)
        ),

      // Leaderboard & Info
      new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("View the cultivation leaderboard")
        .addStringOption((option) =>
          option
            .setName("sort_by")
            .setDescription("Sort by")
            .addChoices(
              { name: "Realm & Level", value: "realm" },
              { name: "Void Crystals", value: "crystals" },
              { name: "Rebirth Count", value: "rebirth" }
            )
        ),

      new SlashCommandBuilder()
        .setName("bloodline")
        .setDescription("View bloodline information"),

      // World Exploration
      new SlashCommandBuilder()
        .setName("look")
        .setDescription("Look around in the world"),

      // Rebirth System
      new SlashCommandBuilder()
        .setName("rebirth")
        .setDescription("Undergo rebirth to start anew with bonuses"),

      // Trading
      new SlashCommandBuilder()
        .setName("trade")
        .setDescription("Trade items with another player")
        .addUserOption((option) =>
          option
            .setName("player")
            .setDescription("Player to trade with")
            .setRequired(true)
        ),

      // Admin Commands
      new SlashCommandBuilder()
        .setName("admin")
        .setDescription("Admin commands (Server Owner Only)")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand((subcommand) =>
          subcommand
            .setName("config")
            .setDescription("Configure server settings")
            .addStringOption((option) =>
              option
                .setName("setting")
                .setDescription("Setting to configure")
                .setRequired(true)
                .addChoices(
                  { name: "XP Multiplier", value: "xp_multiplier" },
                  { name: "Welcome Channel", value: "welcome_channel" },
                  { name: "Sect Master", value: "sect_master" }
                )
            )
            .addStringOption((option) =>
              option
                .setName("value")
                .setDescription("Value to set")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("grant")
            .setDescription("Grant levels to a user")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("User to grant levels to")
                .setRequired(true)
            )
            .addIntegerOption((option) =>
              option
                .setName("levels")
                .setDescription("Number of levels")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("banish")
            .setDescription("Reset a user's cultivation")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("User to banish")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("event")
            .setDescription("Start a server-wide event")
            .addStringOption((option) =>
              option
                .setName("type")
                .setDescription("Event type")
                .setRequired(true)
                .addChoices(
                  { name: "Double XP", value: "double_xp" },
                  { name: "Triple Crystals", value: "triple_crystals" },
                  { name: "Faction War", value: "faction_war" },
                  { name: "Treasure Hunt", value: "treasure_hunt" }
                )
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("add_item")
            .setDescription("Add item to shop")
            .addStringOption((option) =>
              option
                .setName("name")
                .setDescription("Item name")
                .setRequired(true)
            )
            .addStringOption((option) =>
              option
                .setName("type")
                .setDescription("Item type")
                .setRequired(true)
                .addChoices(
                  { name: "Weapon", value: "weapon" },
                  { name: "Armor", value: "armor" },
                  { name: "Consumable", value: "consumable" },
                  { name: "Treasure", value: "treasure" },
                  { name: "Skill", value: "skill" }
                )
            )
            .addIntegerOption((option) =>
              option
                .setName("price")
                .setDescription("Price in void crystals")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("add_mission")
            .setDescription("Add mission")
            .addStringOption((option) =>
              option
                .setName("title")
                .setDescription("Mission title")
                .setRequired(true)
            )
            .addIntegerOption((option) =>
              option
                .setName("xp_reward")
                .setDescription("XP reward")
                .setRequired(true)
            )
            .addIntegerOption((option) =>
              option
                .setName("crystal_reward")
                .setDescription("Crystal reward")
                .setRequired(true)
            )
        ),

      // Sect Master exclusive announcement command
      new SlashCommandBuilder()
        .setName("sect_announcement")
        .setDescription("Make a server-wide announcement (Supreme Sect Master only)")
        .addStringOption((option) =>
          option
            .setName("title")
            .setDescription("Announcement title")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("Announcement message")
            .setRequired(true)
        ),

      // Chapter announcement command for Jadescrolls novel
      new SlashCommandBuilder()
        .setName("post_chapter")
        .setDescription("Post a new chapter from Peerless Immortal God (Sect Master only)")
        .addStringOption((option) =>
          option
            .setName("title")
            .setDescription("Chapter title (e.g., 'The Journey Begins')")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("url")
            .setDescription("Link to the chapter on Jadescrolls")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("chapter_number")
            .setDescription("Chapter number")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("cover_image")
            .setDescription("URL to chapter cover image (optional)")
            .setRequired(false)
        ),

      // Games - For organizing games in channels
      new SlashCommandBuilder()
        .setName("startgame")
        .setDescription("Start a game in the channel")
        .addStringOption((option) =>
          option
            .setName("game")
            .setDescription("Game to play")
            .setRequired(true)
            .addChoices(
              { name: "Trivia - Cultivation facts", value: "trivia" },
              { name: "Guess Number (1-100)", value: "number" },
              { name: "Riddle Challenge", value: "riddle" },
              { name: "Fortune Telling", value: "fortune" }
            )
        ),
    ];

    this.client.on("ready", async () => {
      const guild = this.client.guilds.cache.first();
      if (guild) {
        try {
          await guild.commands.set(commands.map((cmd) => cmd.toJSON()));
          console.log(`✅ Registered ${commands.length} commands`);
        } catch (error) {
          console.error("❌ Failed to register commands:", error);
        }
      }
    });
  }

  private async handleNewMember(member: any) {
    try {
      let user = await storage.getUserByDiscordId(
        member.user.id,
        member.guild.id
      );
      if (!user) {
        const isSupremeSectMaster = member.user.id === "1344237246240391272";
        user = await storage.createUser({
          discordId: member.user.id,
          username: member.user.username,
          avatar: member.user.displayAvatarURL(),
          serverId: member.guild.id,
          isSupremeSectMaster,
          ...(isSupremeSectMaster && {
            rank: "Supreme Sect Master",
            realm: "True God Realm",
            level: 9,
            xp: 999999,
            voidCrystals: 999999999,
            sectPoints: 999999,
            karma: 999999,
            fate: 999999,
          }),
        } as any);
      }

      // Send welcome message to WELCOME HALL with member stats
      const channels = member.guild.channels.cache;
      let welcomeChannel = channels.find((c: any) => c.name === "welcome" || c.name === "welcome-hall") as any;
      if (!welcomeChannel) {
        welcomeChannel = channels.find((c: any) => c.isTextBased() && !c.isDMBased()) as any;
      }
      
      if (welcomeChannel && 'send' in welcomeChannel && user) {
        const welcomeEmbed = new EmbedBuilder()
          .setTitle("🙏 Welcome to the Void Sect!")
          .setDescription(`Welcome, new disciple **${member.user.username}**! 🌟\n\nYou have entered the legendary Void Sect. Begin your cultivation journey and ascend through 25 realms of power!`)
          .setColor(0x9966ff)
          .addFields(
            { name: "🏔️ Starting Realm", value: user.realm || "Connate Realm", inline: true },
            { name: "📊 Starting Level", value: user.level.toString(), inline: true },
            { name: "⭐ Rank", value: user.rank || "Outer Disciple", inline: true },
            { name: "💎 Starting Resources", value: `${user.voidCrystals} Void Crystals\n${user.sectPoints} Sect Points\n${user.karma} Karma`, inline: true },
            { name: "Getting Started", value: "Use `/profile` to see your status\nUse `/cultivate` to gain XP\nUse `/breakthrough` at level 9 to advance realms", inline: false },
            { name: "Daily Rewards", value: "Receive void crystals daily based on rank\nParticipate in events for rare treasures\nBuild your power steadily", inline: false },
            { name: "How to Advance", value: "Gain XP through chatting and missions\nReach level 9 to breakthrough\nClimb through 25 realms to become Immortal", inline: false }
          )
          .setThumbnail(member.user.displayAvatarURL())
          .setTimestamp();

        await welcomeChannel.send({ content: `Welcome, <@${member.user.id}>!`, embeds: [welcomeEmbed] }).catch(console.error);
      }
    } catch (error) {
      console.error("Error creating user profile:", error);
    }
  }

  private async handleChatXp(message: any) {
    try {
      const user = await storage.getUserByDiscordId(
        message.author.id,
        message.guild.id
      );
      if (!user) {
        await storage.createUser({
          discordId: message.author.id,
          username: message.author.username,
          avatar: message.author.displayAvatarURL(),
          serverId: message.guild.id,
        } as any);
        return;
      }

      const xpGain = Math.floor(Math.random() * 10) + 5;
      const newXp = user.xp + xpGain;
      // Exponential XP requirements: 100 * level^2
      const xpToNextLevel = 100 * (user.level ** 2);

      if (newXp >= xpToNextLevel) {
        // Check if can breakthrough to next realm at level 9
        let realmIndex = cultivationRealms.indexOf(user.realm as any);
        let newRealm = user.realm;
        let newLevel = user.level + 1;
        
        if (newLevel > 9 && realmIndex < cultivationRealms.length - 1) {
          newRealm = cultivationRealms[realmIndex + 1];
          newLevel = 1;
        } else if (newLevel > 9) {
          newLevel = 9; // Cap at max level
        }

        const realmChanged = newRealm !== user.realm;
        
        await storage.updateUser(user.id, {
          level: newLevel,
          realm: newRealm,
          xp: newXp - xpToNextLevel,
        } as any);

        // Announce realm breakthrough to the server
        if (realmChanged) {
          const channels = message.guild.channels.cache;
          const textChannel = channels.find((c: any) => c.isTextBased() && !c.isDMBased()) as any;
          
          if (textChannel && 'send' in textChannel) {
            const breakthroughEmbed = new EmbedBuilder()
              .setTitle("⚡ REALM BREAKTHROUGH!")
              .setDescription(`🌟 **${message.author.username}** has achieved a magnificent breakthrough!\n\n**New Realm**: ${newRealm}`)
              .setColor(0xffaa00)
              .addFields(
                { name: "Previous Realm", value: user.realm || "Connate Realm", inline: true },
                { name: "New Realm", value: newRealm, inline: true },
                { name: "Level Reset", value: "1", inline: true }
              )
              .setThumbnail(message.author.displayAvatarURL())
              .setTimestamp();

            await textChannel.send({ embeds: [breakthroughEmbed] }).catch(console.error);
          }
        }
      } else {
        await storage.updateUser(user.id, { xp: newXp } as any);
      }
    } catch (error) {
      console.error("Error handling chat XP:", error);
    }
  }

  private async handleSlashCommand(interaction: any) {
    const { commandName } = interaction;

    try {
      switch (commandName) {
        case "profile":
          await this.handleProfileCommand(interaction);
          break;
        case "cultivate":
          await this.handleCultivateCommand(interaction);
          break;
        case "breakthrough":
          await this.handleBreakthroughCommand(interaction);
          break;
        case "spar":
          await this.handleSparCommand(interaction);
          break;
        case "faction":
          await this.handleFactionCommand(interaction);
          break;
        case "shop":
          await this.handleShopCommand(interaction);
          break;
        case "buy":
          await this.handleBuyCommand(interaction);
          break;
        case "inventory":
          await this.handleInventoryCommand(interaction);
          break;
        case "equip":
          await this.handleEquipCommand(interaction);
          break;
        case "missions":
          await this.handleMissionsCommand(interaction);
          break;
        case "complete_mission":
          await this.handleCompleteMissionCommand(interaction);
          break;
        case "leaderboard":
          await this.handleLeaderboardCommand(interaction);
          break;
        case "rebirth":
          await this.handleRebirthCommand(interaction);
          break;
        case "look":
          await this.handleLookCommand(interaction);
          break;
        case "stats":
          await this.handleStatsCommand(interaction);
          break;
        case "bloodline":
          await this.handleBloodlineCommand(interaction);
          break;
        case "trade":
          await this.handleTradeCommand(interaction);
          break;
        case "admin":
          await this.handleAdminCommand(interaction);
          break;
        case "sect_announcement":
          await this.handleSectAnnouncementCommand(interaction);
          break;
        case "post_chapter":
          await this.handlePostChapterCommand(interaction);
          break;
        default:
          await interaction.reply({
            content: "Unknown command!",
            ephemeral: true,
          });
      }
    } catch (error) {
      const errMsg = `❌ Error handling slash command: ${commandName}`;
      console.error(errMsg, error);
      const serverId = interaction.guildId;
      if (serverId) {
        await this.logBotEvent(serverId, "Errors", errMsg, {
          command: commandName,
          error: String(error),
          user: interaction.user.tag,
          timestamp: new Date().toISOString(),
        });
      }
      try {
        await interaction.reply({
          content: "An error occurred. Please try again.",
          ephemeral: true,
        });
      } catch (e) {
        console.error("Failed to send error reply:", e);
      }
    }
  }

  private async getOrCreateUser(interaction: any) {
    try {
      let user = await storage.getUserByDiscordId(
        interaction.user.id,
        interaction.guild.id
      );
      if (!user) {
        const isSupremeSectMaster = interaction.user.id === "1344237246240391272";
        user = await storage.createUser({
          discordId: interaction.user.id,
          username: interaction.user.username,
          avatar: interaction.user.displayAvatarURL(),
          serverId: interaction.guild.id,
          isSupremeSectMaster,
          // Grant infinite resources to supreme sect master
          ...(isSupremeSectMaster && {
            rank: "Supreme Sect Master",
            realm: "True God Realm",
            level: 9,
            xp: 999999,
            voidCrystals: 999999999,
            sectPoints: 999999,
            karma: 999999,
            fate: 999999,
          }),
        } as any);
      } else if (user.discordId === "1344237246240391272" && !user.isSupremeSectMaster) {
        // Update existing user to supreme sect master status
        user = (await storage.updateUser(user.id, {
          isSupremeSectMaster: true,
          rank: "Supreme Sect Master",
          realm: "True God Realm",
          level: 9,
          xp: 999999,
          voidCrystals: 999999999,
          sectPoints: 999999,
          karma: 999999,
          fate: 999999,
        } as any)) as any;
        const logMsg = "👑 Supreme Sect Master initialized";
        await this.logBotEvent(interaction.guild.id, "Users", logMsg, {
          userId: interaction.user.id,
          username: interaction.user.username,
          rank: "Supreme Sect Master",
        });
      }
      return user;
    } catch (error) {
      console.error("Error in getOrCreateUser:", error);
      throw error;
    }
  }

  private async handleProfileCommand(interaction: any) {
    try {
      await interaction.deferReply();
      const user = await this.getOrCreateUser(interaction);
      if (!user) {
        await interaction.editReply("Could not load profile.");
        return;
      }

      // Format resources - Supreme Sect Master has infinite resources
      const voidCrystalsDisplay = user.isSupremeSectMaster ? "∞ Unlimited" : user.voidCrystals.toString();
      const sectPointsDisplay = user.isSupremeSectMaster ? "∞ Unlimited" : user.sectPoints.toString();
      const karmaDisplay = user.isSupremeSectMaster ? "∞ Unlimited" : user.karma.toString();
      const fateDisplay = user.isSupremeSectMaster ? "∞ Unlimited" : user.fate.toString();

      const embed = new EmbedBuilder()
        .setTitle(`⚔️ ${user.username}'s Cultivation Profile`)
        .setColor(user.isSupremeSectMaster ? 0xffaa00 : 0x00d4ff)
        .addFields(
          {
            name: "🏔️ Realm",
            value: user.realm || "Connate Realm",
            inline: true,
          },
          { name: "📊 Level", value: user.level.toString(), inline: true },
          { name: "⭐ Rank", value: user.rank || "Outer Disciple", inline: true },
          {
            name: "📈 XP Progress",
            value: user.isSupremeSectMaster ? "∞ Max" : `${user.xp} / ${100 * user.level}`,
            inline: true,
          },
          {
            name: "💎 Void Crystals",
            value: voidCrystalsDisplay,
            inline: true,
          },
          {
            name: "✨ Sect Points",
            value: sectPointsDisplay,
            inline: true,
          },
          {
            name: "🔄 Rebirth Count",
            value: user.rebirthCount.toString(),
            inline: true,
          },
          { name: "✅ Karma", value: karmaDisplay, inline: true },
          { name: "🎯 Fate", value: fateDisplay, inline: true }
        )
        .setThumbnail(user.avatar || interaction.user.displayAvatarURL())
        .setTimestamp();

      // Add Faction if they're in one
      if (user.factionId) {
        const faction = await storage.getFactionById(user.factionId);
        if (faction) {
          embed.addFields({
            name: "⚔️ Faction",
            value: `${faction.name} (${user.factionRank || "Member"})`,
            inline: true,
          });
        }
      }

      // Add Clan if they're in one
      if (user.clanId) {
        const clan = await storage.getClanById(user.clanId);
        if (clan) {
          embed.addFields({
            name: "🏛️ Clan",
            value: `${clan.name} (${user.clanRole || "Member"})`,
            inline: true,
          });
        }
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in handleProfileCommand:", error);
      await interaction.editReply({
        content: "Error fetching profile.",
      });
    }
  }

  private async handleCultivateCommand(interaction: any) {
    try {
      await interaction.deferReply();
      const user = await this.getOrCreateUser(interaction);

      if (user.isMeditating) {
        // Stop meditation
        await storage.updateUser(user.id, {
          isMeditating: false,
          meditationStartedAt: null,
        } as any);

        const embed = new EmbedBuilder()
          .setTitle("🧘 Meditation Ended")
          .setDescription("You have exited your meditative state.")
          .setColor(0xff8800)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } else {
        // Start meditation
        await storage.updateUser(user.id, {
          isMeditating: true,
          meditationStartedAt: new Date(),
        } as any);

        const embed = new EmbedBuilder()
          .setTitle("🧘 Meditation Started")
          .setDescription("You enter a deep meditative state...\n\nYou will slowly gain XP as long as you remain on Discord.")
          .setColor(0x00ff88)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      console.error("Error in handleCultivateCommand:", error);
      await interaction.editReply({
        content: "Error during meditation.",
      });
    }
  }

  private async distributeMeditationXp() {
    try {
      const guilds = Array.from(this.client.guilds.cache.entries());
      
      for (const [serverId] of guilds) {
        const users = await storage.getUsersInServer(serverId);
        
        for (const user of users) {
          if (user.isMeditating && user.meditationStartedAt) {
            // Very slow XP gain - 1-2 XP per minute
            const xpGain = Math.floor(Math.random() * 2) + 1;
            await storage.updateUser(user.id, {
              xp: user.xp + xpGain,
            } as any);
          }
        }
      }
    } catch (error) {
      console.error("Error distributing meditation XP:", error);
    }
  }

  private async handleBreakthroughCommand(interaction: any) {
    try {
      await interaction.deferReply();
      const user = await this.getOrCreateUser(interaction);

      const currentRealmIndex = cultivationRealms.indexOf(
        user.realm as any
      );

      if (
        currentRealmIndex === -1 ||
        currentRealmIndex >= cultivationRealms.length - 1
      ) {
        await interaction.editReply({
          content: "You cannot breakthrough further!",
        });
        return;
      }

      if (user.level < 9) {
        await interaction.editReply({
          content: "You must reach level 9 to breakthrough!",
        });
        return;
      }

      const success = Math.random() > 0.4;

      if (success) {
        const nextRealm = cultivationRealms[currentRealmIndex + 1];
        await storage.updateUser(user.id, {
          realm: nextRealm,
          level: 1,
          xp: 0,
          voidCrystals: user.voidCrystals + 100,
        } as any);

        const embed = new EmbedBuilder()
          .setTitle("🌟 Breakthrough Successful!")
          .setDescription(`You have advanced to ${nextRealm}!`)
          .setColor(0xffd700)
          .addFields(
            { name: "New Realm", value: nextRealm, inline: true },
            { name: "Bonus Crystals", value: "+100", inline: true }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle("💥 Breakthrough Failed!")
          .setDescription(
            "You were not ready for this breakthrough. Your power was insufficient."
          )
          .setColor(0xff4444)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      console.error("Error in handleBreakthroughCommand:", error);
      await interaction.editReply({
        content: "Error during breakthrough.",
      });
    }
  }

  private async handleStatsCommand(interaction: any) {
    try {
      await interaction.deferReply();
      const user = await this.getOrCreateUser(interaction);

      const embed = new EmbedBuilder()
        .setTitle(`📊 ${user.username}'s Detailed Stats`)
        .setColor(0x00d4ff)
        .addFields(
          {
            name: "Cultivation",
            value: `Realm: ${user.realm || "Connate Realm"}\nLevel: ${
              user.level
            }\nXP: ${user.xp}/${100 * user.level}`,
            inline: true,
          },
          {
            name: "Currency",
            value: `Void Crystals: ${user.voidCrystals}\nSect Points: ${
              user.sectPoints
            }\nKarma: ${user.karma}\nFate: ${user.fate}`,
            inline: true,
          },
          {
            name: "Special",
            value: `Rebirth Count: ${user.rebirthCount}\nRank: ${
              user.rank || "Outer Disciple"
            }\nFaction: ${user.factionRank || "None"}`,
            inline: true,
          }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in handleStatsCommand:", error);
      await interaction.editReply({
        content: "Error fetching stats.",
      });
    }
  }

  private async handleSparCommand(interaction: any) {
    try {
      await interaction.deferReply();
      const user = await this.getOrCreateUser(interaction);

      const opponent = interaction.options.getUser("opponent");
      const opponentUser = await storage.getUserByDiscordId(
        opponent.id,
        interaction.guild.id
      );

      if (!opponentUser) {
        await interaction.editReply({
          content: `${opponent.username} is not registered.`,
        });
        return;
      }

      if (opponent.id === interaction.user.id) {
        await interaction.editReply({
          content: "You cannot spar with yourself!",
        });
        return;
      }

      const userWins =
        Math.random() * user.level > Math.random() * opponentUser.level;

      const embed = new EmbedBuilder()
        .setTitle("⚔️ Sparring Match")
        .setDescription(`${user.username} vs ${opponent.username}`)
        .setColor(userWins ? 0x00ff88 : 0xff8800)
        .addFields(
          {
            name: "Winner",
            value: userWins ? user.username : opponent.username,
            inline: false,
          },
          {
            name: `${user.username}'s Realm`,
            value: user.realm || "Connate Realm",
            inline: true,
          },
          {
            name: `${opponent.username}'s Realm`,
            value: opponentUser.realm || "Connate Realm",
            inline: true,
          }
        )
        .setTimestamp();

      if (userWins) {
        await storage.updateUser(user.id, {
          xp: user.xp + 50,
          voidCrystals: user.voidCrystals + 10,
          karma: user.karma + 5,
        } as any);
      } else {
        await storage.updateUser(opponentUser.id, {
          xp: opponentUser.xp + 50,
          voidCrystals: opponentUser.voidCrystals + 10,
          karma: opponentUser.karma + 5,
        } as any);
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in handleSparCommand:", error);
      await interaction.editReply({
        content: "Error during spar.",
      });
    }
  }

  private async handleFactionCommand(interaction: any) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "create":
        await this.handleCreateFaction(interaction);
        break;
      case "list":
        await this.handleListFactions(interaction);
        break;
      case "join":
        await this.handleJoinFaction(interaction);
        break;
      case "leave":
        await this.handleLeaveFaction(interaction);
        break;
      case "info":
        await this.handleFactionInfo(interaction);
        break;
    }
  }

  private async handleCreateFaction(interaction: any) {
    try {
      await interaction.deferReply();
      const user = await this.getOrCreateUser(interaction);

      if (user.factionId) {
        await interaction.editReply({
          content: "You are already in a faction!",
        });
        return;
      }

      const name = interaction.options.getString("name");

      const faction = await storage.createFaction({
        name,
        description: null,
        leaderId: user.id,
        serverId: interaction.guild.id,
      } as any);

      await storage.updateUser(user.id, {
        factionId: faction.id,
        factionRank: "Leader",
      } as any);

      const embed = new EmbedBuilder()
        .setTitle("🏛️ Faction Created")
        .setDescription(`${name} has been founded!`)
        .setColor(0x00d4ff)
        .addFields({ name: "Your Rank", value: "Leader", inline: true })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in handleCreateFaction:", error);
      await interaction.editReply({
        content: "Error creating faction.",
      });
    }
  }

  private async handleListFactions(interaction: any) {
    try {
      await interaction.deferReply();
      const factions = await storage.getFactionsByServer(interaction.guild.id);

      if (factions.length === 0) {
        await interaction.editReply({
          content: "No factions exist yet!",
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle("🏛️ All Factions")
        .setColor(0x00d4ff);

      factions.slice(0, 10).forEach((faction) => {
        embed.addFields({
          name: `${faction.name} (ID: ${faction.id})`,
          value: `Members: ${faction.memberCount || 0} | War Points: ${
            faction.warPoints || 0
          }`,
          inline: false,
        });
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in handleListFactions:", error);
      await interaction.editReply({
        content: "Error fetching factions.",
      });
    }
  }

  private async handleJoinFaction(interaction: any) {
    try {
      await interaction.deferReply();
      const user = await this.getOrCreateUser(interaction);

      if (user.factionId) {
        await interaction.editReply({
          content: "You are already in a faction!",
        });
        return;
      }

      const factionId = interaction.options.getInteger("faction_id");
      const faction = await storage.getFactionById(factionId);

      if (!faction) {
        await interaction.editReply({
          content: "Faction not found.",
        });
        return;
      }

      await storage.joinFaction(user.id, faction.id, "Member");

      const embed = new EmbedBuilder()
        .setTitle("🏛️ Faction Joined")
        .setDescription(`You have joined ${faction.name}!`)
        .setColor(0x00d4ff)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in handleJoinFaction:", error);
      await interaction.editReply({
        content: "Error joining faction.",
      });
    }
  }

  private async handleLeaveFaction(interaction: any) {
    try {
      await interaction.deferReply();
      const user = await this.getOrCreateUser(interaction);

      if (!user.factionId) {
        await interaction.editReply({
          content: "You are not in a faction.",
        });
        return;
      }

      const faction = await storage.getFactionById(user.factionId);
      await storage.leaveFaction(user.id);

      const embed = new EmbedBuilder()
        .setTitle("🏛️ Faction Left")
        .setDescription(`You have left ${faction?.name || "the faction"}.`)
        .setColor(0xff4444)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in handleLeaveFaction:", error);
      await interaction.editReply({
        content: "Error leaving faction.",
      });
    }
  }

  private async handleFactionInfo(interaction: any) {
    try {
      await interaction.deferReply();
      const user = await this.getOrCreateUser(interaction);

      if (!user.factionId) {
        await interaction.editReply({
          content: "You are not in a faction.",
        });
        return;
      }

      const faction = await storage.getFactionById(user.factionId);
      if (!faction) {
        await interaction.editReply({
          content: "Faction not found.",
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`🏛️ ${faction.name}`)
        .setDescription(faction.description || "No description provided")
        .setColor(0x00d4ff)
        .addFields(
          {
            name: "Members",
            value: (faction.memberCount || 0).toString(),
            inline: true,
          },
          {
            name: "War Points",
            value: (faction.warPoints || 0).toString(),
            inline: true,
          },
          {
            name: "Your Rank",
            value: user.factionRank || "Member",
            inline: true,
          }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in handleFactionInfo:", error);
      await interaction.editReply({
        content: "Error fetching faction info.",
      });
    }
  }

  private async handleShopCommand(interaction: any) {
    try {
      await interaction.deferReply();
      const items = await storage.getItems();

      const embed = new EmbedBuilder()
        .setTitle("🏪 Cultivation Shop")
        .setDescription("Purchase items with Void Crystals")
        .setColor(0x00d4ff);

      if (items.length === 0) {
        embed.setDescription("Shop is empty!");
      } else {
        items.slice(0, 10).forEach((item) => {
          embed.addFields({
            name: `${item.name} (ID: ${item.id}) - ${item.rarity}`,
            value: `${item.description || "No description"}\n💎 Price: ${
              item.price
            }`,
            inline: false,
          });
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in handleShopCommand:", error);
      await interaction.editReply({
        content: "Error fetching shop.",
      });
    }
  }

  private async handleBuyCommand(interaction: any) {
    try {
      await interaction.deferReply();
      const user = await this.getOrCreateUser(interaction);

      const itemId = interaction.options.getInteger("item_id");
      const quantity = interaction.options.getInteger("quantity") || 1;

      const item = await storage.getItemById(itemId);
      if (!item) {
        await interaction.editReply({
          content: "Item not found.",
        });
        return;
      }

      const totalCost = item.price * quantity;
      if (user.voidCrystals < totalCost) {
        await interaction.editReply({
          content: `You need ${totalCost} void crystals, but only have ${user.voidCrystals}.`,
        });
        return;
      }

      await storage.updateUser(user.id, {
        voidCrystals: user.voidCrystals - totalCost,
      } as any);
      await storage.addItemToUser(user.id, itemId, quantity);

      const embed = new EmbedBuilder()
        .setTitle("✅ Purchase Successful")
        .setDescription(`You purchased ${quantity}x ${item.name}`)
        .setColor(0x00ff88)
        .addFields({
          name: "Cost",
          value: `-${totalCost} void crystals`,
          inline: true,
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in handleBuyCommand:", error);
      await interaction.editReply({
        content: "Error purchasing item.",
      });
    }
  }

  private async handleInventoryCommand(interaction: any) {
    try {
      await interaction.deferReply();
      const user = await this.getOrCreateUser(interaction);

      const items = await storage.getUserItems(user.id);

      const embed = new EmbedBuilder()
        .setTitle("🎒 Your Inventory")
        .setColor(0x00d4ff);

      if (items.length === 0) {
        embed.setDescription("Your inventory is empty!");
      } else {
        items.slice(0, 10).forEach((userItem) => {
          embed.addFields({
            name: `${userItem.item.name} (ID: ${userItem.item.id})`,
            value: `Quantity: ${userItem.quantity} | Equipped: ${
              userItem.isEquipped ? "Yes" : "No"
            } | Rarity: ${userItem.item.rarity}`,
            inline: false,
          });
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in handleInventoryCommand:", error);
      await interaction.editReply({
        content: "Error fetching inventory.",
      });
    }
  }

  private async handleEquipCommand(interaction: any) {
    try {
      await interaction.deferReply();
      const user = await this.getOrCreateUser(interaction);

      const itemId = interaction.options.getInteger("item_id");
      const userItems = await storage.getUserItems(user.id);
      const userItem = userItems.find((ui) => ui.item.id === itemId);

      if (!userItem) {
        await interaction.editReply({
          content: "Item not found in your inventory.",
        });
        return;
      }

      await storage.equipItem(user.id, itemId);

      const embed = new EmbedBuilder()
        .setTitle("✅ Item Equipped")
        .setDescription(`You equipped ${userItem.item.name}`)
        .setColor(0x00ff88)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in handleEquipCommand:", error);
      await interaction.editReply({
        content: "Error equipping item.",
      });
    }
  }

  private async handleMissionsCommand(interaction: any) {
    try {
      await interaction.deferReply();
      const user = await this.getOrCreateUser(interaction);

      const missions = await storage.getUserMissions(user.id);

      const embed = new EmbedBuilder()
        .setTitle("📋 Your Missions")
        .setColor(0x00d4ff);

      if (missions.length === 0) {
        embed.setDescription("You have no active missions!");
      } else {
        missions.slice(0, 10).forEach((userMission) => {
          embed.addFields({
            name: `${userMission.mission.title} (ID: ${userMission.mission.id})`,
            value: `Status: ${userMission.status} | XP Reward: ${
              userMission.mission.xpReward
            } | Crystal Reward: ${userMission.mission.crystalReward}`,
            inline: false,
          });
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in handleMissionsCommand:", error);
      await interaction.editReply({
        content: "Error fetching missions.",
      });
    }
  }

  private async handleCompleteMissionCommand(interaction: any) {
    try {
      await interaction.deferReply();
      const user = await this.getOrCreateUser(interaction);

      const missionId = interaction.options.getInteger("mission_id");
      const userMissions = await storage.getUserMissions(user.id);
      const userMission = userMissions.find(
        (um) => um.mission.id === missionId
      );

      if (!userMission) {
        await interaction.editReply({
          content: "Mission not found.",
        });
        return;
      }

      await storage.completeMission(user.id, missionId);

      await storage.updateUser(user.id, {
        xp: user.xp + userMission.mission.xpReward,
        voidCrystals:
          user.voidCrystals + userMission.mission.crystalReward,
      } as any);

      const embed = new EmbedBuilder()
        .setTitle("✅ Mission Completed")
        .setDescription(`${userMission.mission.title}`)
        .setColor(0x00ff88)
        .addFields(
          {
            name: "XP Reward",
            value: `+${userMission.mission.xpReward}`,
            inline: true,
          },
          {
            name: "Crystal Reward",
            value: `+${userMission.mission.crystalReward}`,
            inline: true,
          }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in handleCompleteMissionCommand:", error);
      await interaction.editReply({
        content: "Error completing mission.",
      });
    }
  }

  private async handleLeaderboardCommand(interaction: any) {
    try {
      await interaction.deferReply();
      const leaderboard = await storage.getLeaderboard(
        interaction.guild.id,
        15
      );

      const embed = new EmbedBuilder()
        .setTitle("📊 Cultivation Leaderboard")
        .setColor(0x00d4ff);

      if (leaderboard.length === 0) {
        embed.setDescription("No cultivators yet!");
      } else {
        leaderboard.forEach((user, index) => {
          embed.addFields({
            name: `#${index + 1} ${user.username}`,
            value: `${user.realm || "Connate Realm"} Lvl ${
              user.level
            } | Crystals: ${user.voidCrystals} | Rebirths: ${user.rebirthCount}`,
            inline: false,
          });
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in handleLeaderboardCommand:", error);
      await interaction.editReply({
        content: "Error fetching leaderboard.",
      });
    }
  }

  private async handleBloodlineCommand(interaction: any) {
    try {
      await interaction.deferReply();
      const user = await this.getOrCreateUser(interaction);

      const embed = new EmbedBuilder()
        .setTitle("🧬 Bloodline")
        .setColor(0x00d4ff);

      if (!user.bloodlineId) {
        embed.setDescription("You have not awakened a bloodline yet!");
      } else {
        const bloodline = await storage.getBloodlineById(user.bloodlineId);
        if (bloodline) {
          embed
            .setTitle(`🧬 ${bloodline.name}`)
            .setDescription(bloodline.description || "No description")
            .addFields(
              {
                name: "Rarity",
                value: bloodline.rarity,
                inline: true,
              },
              {
                name: "Power Bonus",
                value: bloodline.powerBonus.toString(),
                inline: true,
              },
              {
                name: "Defense Bonus",
                value: bloodline.defenseBonus.toString(),
                inline: true,
              }
            );
        } else {
          embed.setDescription("Bloodline not found!");
        }
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in handleBloodlineCommand:", error);
      await interaction.editReply({
        content: "Error fetching bloodline.",
      });
    }
  }

  private async handleLookCommand(interaction: any) {
    try {
      await interaction.deferReply();
      const locations = [
        "You see a peaceful valley with flowing rivers.",
        "A misty mountain peak looms in the distance.",
        "An ancient temple stands before you, shrouded in mystery.",
        "Wild beasts roam the untamed wilderness around you.",
        "A bustling city marketplace fills the air with sounds of commerce.",
        "Celestial clouds drift lazily across the sky.",
        "An ancient statue of an immortal sage stands weathered and wise.",
        "A hidden treasure chest glimmers faintly in the darkness.",
        "You hear the distant sound of a waterfall echoing through canyons.",
        "A portal of shimmering light appears before you for a moment.",
      ];

      const location =
        locations[Math.floor(Math.random() * locations.length)];

      const embed = new EmbedBuilder()
        .setTitle("👀 You Look Around")
        .setDescription(location)
        .setColor(0x00d4ff)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in handleLookCommand:", error);
      await interaction.editReply({
        content: "Error looking around.",
      });
    }
  }

  private async handleRebirthCommand(interaction: any) {
    try {
      await interaction.deferReply();
      const user = await this.getOrCreateUser(interaction);

      const currentRealmIndex = cultivationRealms.indexOf(
        user.realm as any
      );

      if (currentRealmIndex < 6) {
        // Before Dao Realm
        await interaction.editReply({
          content: "You must reach Dao Realm or higher to rebirth!",
        });
        return;
      }

      await storage.updateUser(user.id, {
        rebirthCount: user.rebirthCount + 1,
        realm: "Connate Realm",
        level: 1,
        xp: 0,
        voidCrystals: user.voidCrystals + 500,
        sectPoints: user.sectPoints + 100,
      } as any);

      const embed = new EmbedBuilder()
        .setTitle("♻️ Rebirth Successful!")
        .setDescription("You have been reborn to the beginning.")
        .setColor(0x00d4ff)
        .addFields(
          {
            name: "Rebirth Count",
            value: (user.rebirthCount + 1).toString(),
            inline: true,
          },
          {
            name: "Bonus Crystals",
            value: "+500",
            inline: true,
          },
          {
            name: "Bonus Sect Points",
            value: "+100",
            inline: true,
          }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in handleRebirthCommand:", error);
      await interaction.editReply({
        content: "Error during rebirth.",
      });
    }
  }

  private async handleTradeCommand(interaction: any) {
    try {
      await interaction.deferReply();
      const embed = new EmbedBuilder()
        .setTitle("🤝 Trading System")
        .setDescription("Trading system is coming soon!")
        .setColor(0x00d4ff)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in handleTradeCommand:", error);
      await interaction.editReply({
        content: "Error with trading.",
      });
    }
  }

  private async handleAdminCommand(interaction: any) {
    const user = await this.getOrCreateUser(interaction);
    // Check if user has admin permissions OR is supreme sect master
    if (
      !user.isSupremeSectMaster &&
      !interaction.memberPermissions.has(
        PermissionFlagsBits.Administrator
      )
    ) {
      await interaction.reply({
        content: "You do not have permission to use admin commands.",
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "config":
        await this.handleAdminConfig(interaction);
        break;
      case "grant":
        await this.handleAdminGrant(interaction);
        break;
      case "banish":
        await this.handleAdminBanish(interaction);
        break;
      case "event":
        await this.handleAdminEvent(interaction);
        break;
      case "add_item":
        await this.handleAdminAddItem(interaction);
        break;
      case "add_mission":
        await this.handleAdminAddMission(interaction);
        break;
    }
  }

  private async handleAdminConfig(interaction: any) {
    try {
      await interaction.deferReply();
      const setting = interaction.options.getString("setting");
      const value = interaction.options.getString("value");

      let settings = await storage.getServerSettings(interaction.guild.id);

      if (!settings) {
        settings = await storage.updateServerSettings(interaction.guild.id, {
          serverId: interaction.guild.id,
        } as any);
      }

      let updated = false;
      if (setting === "xp_multiplier") {
        const multiplier = parseFloat(value);
        if (multiplier > 0) {
          await storage.updateServerSettings(interaction.guild.id, {
            xpMultiplier: multiplier.toString() as any,
          } as any);
          updated = true;
        }
      }

      if (updated) {
        await interaction.editReply({
          content: `✅ Updated ${setting} to ${value}`,
        });
      } else {
        await interaction.editReply({
          content: "Invalid setting or value.",
        });
      }
    } catch (error) {
      console.error("Error in handleAdminConfig:", error);
      await interaction.editReply({
        content: "Error updating config.",
      });
    }
  }

  private async handleAdminGrant(interaction: any) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser("user");
      const levels = interaction.options.getInteger("levels");

      const user = await storage.getUserByDiscordId(
        targetUser.id,
        interaction.guild.id
      );

      if (!user) {
        await interaction.editReply({
          content: "User not found.",
        });
        return;
      }

      await storage.updateUser(user.id, {
        level: Math.min(user.level + levels, 9),
      } as any);

      await interaction.editReply({
        content: `✅ Granted ${levels} levels to ${targetUser.username}`,
      });
    } catch (error) {
      console.error("Error in handleAdminGrant:", error);
      await interaction.editReply({
        content: "Error granting levels.",
      });
    }
  }

  private async handleAdminBanish(interaction: any) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser("user");

      const user = await storage.getUserByDiscordId(
        targetUser.id,
        interaction.guild.id
      );

      if (!user) {
        await interaction.editReply({
          content: "User not found.",
        });
        return;
      }

      await storage.updateUser(user.id, {
        realm: "Connate Realm",
        level: 1,
        xp: 0,
      } as any);

      await interaction.editReply({
        content: `✅ Banished ${targetUser.username} back to Connate Realm`,
      });
    } catch (error) {
      console.error("Error in handleAdminBanish:", error);
      await interaction.editReply({
        content: "Error banishing user.",
      });
    }
  }

  private async handleAdminEvent(interaction: any) {
    try {
      await interaction.deferReply();
      const eventType = interaction.options.getString("type");

      let message = "";
      switch (eventType) {
        case "double_xp":
          message =
            "🎉 A mystical power doubles all XP gains! The Heavens favor your cultivation!";
          break;
        case "triple_crystals":
          message =
            "💎 The Void trembles! All void crystal rewards tripled for the next hour!";
          break;
        case "faction_war":
          message =
            "⚔️ FACTION WAR BEGINS! All factions compete for dominance and glory!";
          break;
        case "treasure_hunt":
          message =
            "🗺️ A legendary treasure hunt begins! Hidden treasures await the worthy!";
          break;
      }

      await interaction.editReply({
        content: `✅ Event started: ${message}`,
      });
    } catch (error) {
      console.error("Error in handleAdminEvent:", error);
      await interaction.editReply({
        content: "Error starting event.",
      });
    }
  }

  private async handleAdminAddItem(interaction: any) {
    try {
      await interaction.deferReply();
      const name = interaction.options.getString("name");
      const type = interaction.options.getString("type");
      const price = interaction.options.getInteger("price");

      await storage.createItem({
        name,
        type: type as any,
        rarity: "common",
        description: "Admin-created item",
        price,
        powerBonus: 0,
        defenseBonus: 0,
        agilityBonus: 0,
        wisdomBonus: 0,
      } as any);

      await interaction.editReply({
        content: `✅ Added item: ${name} (${type}) for ${price} void crystals`,
      });
    } catch (error) {
      console.error("Error in handleAdminAddItem:", error);
      await interaction.editReply({
        content: "Error adding item.",
      });
    }
  }

  private async handleAdminAddMission(interaction: any) {
    try {
      await interaction.deferReply();
      const title = interaction.options.getString("title");
      const xpReward = interaction.options.getInteger("xp_reward");
      const crystalReward = interaction.options.getInteger("crystal_reward");

      await storage.createMission({
        title,
        description: "Admin-created mission",
        type: "daily",
        xpReward,
        crystalReward,
        isActive: true,
        serverId: interaction.guild.id,
      } as any);

      await interaction.editReply({
        content: `✅ Added mission: ${title} (${xpReward} XP, ${crystalReward} crystals)`,
      });
    } catch (error) {
      console.error("Error in handleAdminAddMission:", error);
      await interaction.editReply({
        content: "Error adding mission.",
      });
    }
  }

  private async handleSectAnnouncementCommand(interaction: any) {
    try {
      const user = await storage.getUserByDiscordId(
        interaction.user.id,
        interaction.guild.id
      );

      // Only Supreme Sect Master can use this command
      if (!user || !user.isSupremeSectMaster) {
        await interaction.reply({
          content: "❌ Only the Supreme Sect Master can use this command!",
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply();
      const title = interaction.options.getString("title");
      const message = interaction.options.getString("message");

      const channels = interaction.guild.channels.cache;
      const textChannel = channels.find((c: any) => c.isTextBased() && !c.isDMBased()) as any;

      if (textChannel && 'send' in textChannel) {
        const announcementEmbed = new EmbedBuilder()
          .setTitle(`📢 ${title}`)
          .setDescription(message)
          .setColor(0xff0000)
          .setAuthor({ 
            name: "Supreme Sect Master",
            iconURL: interaction.user.displayAvatarURL()
          })
          .setTimestamp();

        await textChannel.send({ embeds: [announcementEmbed] }).catch(console.error);
      }

      await interaction.editReply({
        content: `✅ Announcement sent: **${title}**`,
      });
    } catch (error) {
      console.error("Error in handleSectAnnouncementCommand:", error);
      await interaction.editReply({
        content: "Error sending announcement.",
      });
    }
  }

  private async handlePostChapterCommand(interaction: any) {
    try {
      const user = await storage.getUserByDiscordId(
        interaction.user.id,
        interaction.guild.id
      );

      // Only Supreme Sect Master can use this
      if (!user || !user.isSupremeSectMaster) {
        await interaction.reply({
          content: "❌ Only the Supreme Sect Master can use this command!",
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply();
      
      const chapterTitle = interaction.options.getString("title");
      const chapterUrl = interaction.options.getString("url");
      const chapterNumber = interaction.options.getInteger("chapter_number");
      const coverImage = interaction.options.getString("cover_image");

      const channels = interaction.guild.channels.cache;
      
      // Find announcement channel
      let announcementChannel = channels.find(
        (c: any) => c.name === "announcements" || c.name === "announcement"
      ) as any;
      if (!announcementChannel) {
        announcementChannel = channels.find((c: any) => c.name === "general") as any;
      }

      // Find discussion channel (peerless immortal god)
      let discussionChannel = channels.find(
        (c: any) => c.name.toLowerCase().includes("peerless") || c.name.toLowerCase().includes("immortal")
      ) as any;
      if (!discussionChannel && announcementChannel) {
        discussionChannel = announcementChannel;
      }

      let postedCount = 0;

      // Post to announcement channel
      if (announcementChannel && "send" in announcementChannel) {
        const embed = new EmbedBuilder()
          .setTitle(`📖 New Chapter Released: ${chapterTitle}`)
          .setDescription(`**Peerless Immortal God** - Chapter ${chapterNumber}`)
          .setURL(chapterUrl)
          .setColor(0xffd700)
          .addFields({
            name: "Read Now",
            value: `[Open Chapter on Jadescrolls](${chapterUrl})`,
            inline: true,
          })
          .setTimestamp();

        if (coverImage) {
          embed.setThumbnail(coverImage);
        }

        await announcementChannel.send({ embeds: [embed] });
        postedCount++;
      }

      // Post to discussion channel if different
      if (discussionChannel && discussionChannel.id !== announcementChannel?.id && "send" in discussionChannel) {
        const discussionEmbed = new EmbedBuilder()
          .setTitle(`💬 Discussion: ${chapterTitle}`)
          .setDescription(`**Peerless Immortal God** - Chapter ${chapterNumber}\n\nWhat did you think of this chapter? Share your thoughts!`)
          .setURL(chapterUrl)
          .setColor(0x9966ff)
          .addFields({
            name: "Read Now",
            value: `[Open Chapter on Jadescrolls](${chapterUrl})`,
            inline: true,
          })
          .setTimestamp();

        if (coverImage) {
          discussionEmbed.setThumbnail(coverImage);
        }

        await discussionChannel.send({ embeds: [discussionEmbed] });
        postedCount++;
      }

      const channelsList = postedCount === 2 
        ? "announcement and discussion channels"
        : postedCount === 1
        ? "announcement channel"
        : "channels";

      await interaction.editReply({
        content: `✅ Chapter posted to ${channelsList}! 📖\n\n**${chapterTitle}** (Chapter ${chapterNumber})`,
      });

      // Log the event
      await this.logBotEvent(interaction.guild.id, "Commands", "📖 Chapter announcement posted", {
        chapter: chapterNumber,
        title: chapterTitle,
        url: chapterUrl,
        channelsPosted: postedCount,
        user: interaction.user.tag,
      });
    } catch (error) {
      console.error("Error in handlePostChapterCommand:", error);
      await interaction.editReply({
        content: "❌ Error posting chapter announcement.",
      });
    }
  }

  // ====== DM CONVERSATION & GAMES ======

  private async handleDMConversation(message: any) {
    try {
      if (!openai) {
        await message.reply("🔮 **DM Chat unavailable** - OpenAI API key not configured. Use `/startgame` for basic games instead.").catch(console.error);
        return;
      }

      const userId = message.author.id;
      const userKey = `dm_${userId}`;

      // Initialize conversation history if new
      if (!this.conversationHistories.has(userKey)) {
        this.conversationHistories.set(userKey, []);
      }

      const conversationHistory = this.conversationHistories.get(userKey) || [];

      // Add user message to history
      conversationHistory.push({
        role: "user",
        content: message.content,
      });

      // Build system prompt for Xianxia cultivation bot
      const systemPrompt = `You are the Void Sect Bot, an intelligent cultivator companion in a Discord cultivation RPG server. You are friendly, knowledgeable about Xianxia and cultivation concepts, and can:
1. Have casual conversations about cultivation, Xianxia novels, and the Void Sect
2. Suggest games like trivia, riddles, fortune telling, and number guessing games
3. Help users understand their cultivation progress and strategies
4. Provide encouragement and lore-friendly advice
Be conversational, use cultivation terminology naturally, and keep responses under 2000 characters. When users ask to play games, offer specific game options like "trivia", "riddle", "fortune_telling", or "number_game".`;

      // Get AI response
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
        ],
        max_completion_tokens: 500,
      });

      const aiResponse = response.choices[0].message.content || "...";

      // Add AI response to history
      conversationHistory.push({
        role: "assistant",
        content: aiResponse,
      });

      // Keep only last 10 messages to avoid memory issues
      if (conversationHistory.length > 20) {
        conversationHistory.splice(0, 2);
      }

      // Detect if user wants to play a game
      const lowerContent = message.content.toLowerCase();
      let gameToStart = null;

      if (lowerContent.includes("trivia") || lowerContent.includes("quiz")) {
        gameToStart = "trivia";
      } else if (lowerContent.includes("riddle") || lowerContent.includes("puzzle")) {
        gameToStart = "riddle";
      } else if (lowerContent.includes("fortune") || lowerContent.includes("tell")) {
        gameToStart = "fortune";
      } else if (lowerContent.includes("number") || lowerContent.includes("guess")) {
        gameToStart = "number";
      }

      // Send AI response
      if (aiResponse.length <= 2000) {
        await message.reply(aiResponse).catch(console.error);
      } else {
        await message.reply(aiResponse.substring(0, 1997) + "...").catch(console.error);
      }

      // Start game if user wants
      if (gameToStart) {
        setTimeout(() => {
          this.startGameInDM(message, gameToStart);
        }, 1000);
      }
    } catch (error) {
      console.error("Error in DM conversation:", error);
      await message.reply("Apologies, cultivator. My meditation was interrupted. Please try again.").catch(console.error);
    }
  }

  private async startGameInDM(message: any, gameType: string) {
    try {
      const userId = message.author.id;
      const gameKey = `${userId}_${gameType}`;

      if (this.activeGames.has(gameKey)) {
        await message.reply("Already playing a game, friend. Finish it first!").catch(console.error);
        return;
      }

      switch (gameType) {
        case "trivia":
          await this.playTrivia(message, gameKey);
          break;
        case "riddle":
          await this.playRiddle(message, gameKey);
          break;
        case "fortune":
          await this.playFortuneTelling(message, gameKey);
          break;
        case "number":
          await this.playNumberGame(message, gameKey);
          break;
      }
    } catch (error) {
      console.error("Error starting game:", error);
    }
  }

  private async playTrivia(message: any, gameKey: string) {
    try {
      if (!openai) {
        await message.reply("🎓 **Basic Trivia** (AI disabled)\n\nQ: What is the highest cultivation realm?\nA) Transcendent\nB) True God Realm\nC) Sage Immortal\nD) Divine Emperor\n\nReply with A, B, C, or D!").catch(console.error);
        this.activeGames.set(gameKey, { type: "trivia", correct: "B", attempts: 0 });
        return;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "user",
            content: "Generate ONE cultivation/Xianxia trivia question with 4 multiple choice answers (A, B, C, D). Format: QUESTION\\n\\nA) answer\\nB) answer\\nC) answer\\nD) answer\\n\\nCORRECT: [A/B/C/D]",
          },
        ],
        max_completion_tokens: 300,
      });

      const triviaText = response.choices[0].message.content || "";
      const correctAnswerMatch = triviaText.match(/CORRECT:\s*([A-D])/i);
      const correctAnswer = correctAnswerMatch ? correctAnswerMatch[1].toUpperCase() : "A";

      this.activeGames.set(gameKey, { type: "trivia", correct: correctAnswer, attempts: 0 });

      await message.reply(
        `🎓 **Cultivation Trivia Challenge!**\n\n${triviaText.replace(/CORRECT:.*$/gi, "").trim()}\n\nReply with A, B, C, or D!`
      ).catch(console.error);
    } catch (error) {
      console.error("Error in trivia:", error);
    }
  }

  private async playRiddle(message: any, gameKey: string) {
    try {
      if (!openai) {
        await message.reply(`🧩 **Riddle Challenge!**\n\nI am the path that reaches the heavens, yet requires no feet to climb. What am I?\n\nReply with your guess!`).catch(console.error);
        this.activeGames.set(gameKey, { type: "riddle", correct: "cultivation" });
        return;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "user",
            content: "Create ONE clever Xianxia-themed riddle with a SHORT answer (1-3 words max). Format: RIDDLE: [riddle here]\\n\\nANSWER: [answer]",
          },
        ],
        max_completion_tokens: 200,
      });

      const riddleText = response.choices[0].message.content || "";
      const answerMatch = riddleText.match(/ANSWER:\s*(.+?)(?:\n|$)/i);
      const correctAnswer = answerMatch ? answerMatch[1].trim().toLowerCase() : "immortal";

      this.activeGames.set(gameKey, { type: "riddle", correct: correctAnswer });

      const riddleOnly = riddleText.replace(/ANSWER:.*$/gi, "").trim();
      await message.reply(`🧩 **Riddle Challenge!**\n\n${riddleOnly}\n\nWhat is the answer? (Reply with your guess!)`).catch(console.error);
    } catch (error) {
      console.error("Error in riddle:", error);
    }
  }

  private async playFortuneTelling(message: any, gameKey: string) {
    try {
      let fortune = "Your path is shrouded in destiny...";

      if (openai) {
        const response = await openai.chat.completions.create({
          model: "gpt-5",
          messages: [
            {
              role: "user",
              content: `Generate a mystical Xianxia fortune telling for a Discord user named "${message.author.username}". Include: destiny prediction, cultivation advice, lucky realm/day, and mystical warning. Keep it under 300 characters. Make it fun and encouraging!`,
            },
          ],
          max_completion_tokens: 200,
        });

        fortune = response.choices[0].message.content || fortune;
      } else {
        const fortunes = [
          "Your cultivation shall reach the True God Realm. Lucky day: Tuesday. Beware of complacency.",
          "The heavens align in your favor, " + message.author.username + ". Push forward with determination. Lucky realm: Immortal Ascension.",
          "Your tribulation awaits, but victory is assured. Trust in your sect brothers and sisters.",
        ];
        fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
      }

      this.activeGames.set(gameKey, { type: "fortune", completed: true });

      const embed = new EmbedBuilder()
        .setTitle(`🔮 Your Cultivation Fortune, ${message.author.username}`)
        .setDescription(fortune)
        .setColor(0x9966ff)
        .setFooter({ text: "May your cultivation reach the heavens!" })
        .setTimestamp();

      await message.reply({ embeds: [embed] }).catch(console.error);

      setTimeout(() => this.activeGames.delete(gameKey), 5000);
    } catch (error) {
      console.error("Error in fortune telling:", error);
    }
  }

  private async playNumberGame(message: any, gameKey: string) {
    try {
      const secretNumber = Math.floor(Math.random() * 100) + 1;

      this.activeGames.set(gameKey, {
        type: "number",
        secret: secretNumber,
        attempts: 0,
        maxAttempts: 7,
      });

      await message.reply(
        `🎯 **Number Guessing Game!**\n\nI'm thinking of a number between 1 and 100. You have 7 attempts to guess it!\n\nGood luck, cultivator! 🍀`
      ).catch(console.error);

      // Store game for answer checking in message handler
      // We'll check when user replies in their next message
    } catch (error) {
      console.error("Error in number game:", error);
    }
  }

  // ====== NEW SYSTEMS: Events, Logging, Moderation, Conversation ======

  private async triggerVoidSectDefense() {
    try {
      console.log("🛡️ VOID SECT DEFENSE: Alien invasion detected!");
      const guilds = Array.from(this.client.guilds.cache.entries());
      
      for (const [serverId] of guilds) {
        const currentEventCount = this.activeEvents.get(serverId) || 0;
        if (currentEventCount >= 3) {
          console.log(`⚠️ Server ${serverId} already has 3 events. Skipping.`);
          continue; // Max 3 simultaneous events
        }

        const channels = this.client.guilds.cache.get(serverId)?.channels.cache;
        if (!channels) continue;

        const textChannel = channels.find((c: any) => c.isTextBased()) as any;
        if (!textChannel || !('send' in textChannel)) continue;

        const users = await storage.getUsersInServer(serverId);
        const alienWave = Math.floor(Math.random() * 3) + 1;
        const waveHealth = 1000 + (alienWave * 500);

        const embed = new EmbedBuilder()
          .setTitle("⚠️ VOID SECT UNDER ATTACK! ⚠️")
          .setDescription(`An alien invasion is upon us! **${alienWave}** waves of extraterrestrial forces attack!`)
          .setColor(0xff0000)
          .addFields(
            { name: "🌀 Void Rift Stability", value: `${waveHealth}/${waveHealth} HP`, inline: false },
            { name: "👾 Aliens Count", value: `Wave ${alienWave}: ${50 * alienWave} entities`, inline: true },
            { name: "⚔️ Disciples Needed", value: `Min Realm: Spirit Realm (Level 4+)`, inline: true },
            { name: "🏆 Victory Rewards", value: "Void Crystals, Custom Titles, Karma + XP Boost", inline: false },
            { name: "💀 Defeat Penalty", value: "Lose Void Crystals, XP reset possible, Realm downgrade risk", inline: false }
          )
          .setTimestamp();

        await textChannel.send({ embeds: [embed] }).catch(console.error);
        this.activeEvents.set(serverId, currentEventCount + 1);

        // Simulate defense battle
        setTimeout(async () => {
          const survivors = users.filter(u => cultivationRealms.indexOf(u.realm) >= 3);
          
          if (survivors.length > 0) {
            const battleResult = Math.random() > 0.3 ? "victory" : "defeat";
            
            if (battleResult === "victory") {
              const victoryEmbed = new EmbedBuilder()
                .setTitle("🎉 VICTORY! The Sect is Saved!")
                .setDescription(`${survivors.length} brave disciples defended the sect!`)
                .setColor(0x00ff00)
                .addFields({
                  name: "Rewards Distributed",
                  value: `Each defender gains:\n💎 1000 Void Crystals\n✨ 100 Sect Points\n🏆 Custom Title: "Void Sect Defender"`,
                  inline: false,
                });

              for (const survivor of survivors) {
                await storage.updateUser(survivor.id, {
                  voidCrystals: survivor.voidCrystals + 1000,
                  sectPoints: survivor.sectPoints + 100,
                } as any);
              }

              await textChannel.send({ embeds: [victoryEmbed] }).catch(console.error);
              await this.logBotEvent(serverId, "Events", "⚔️ Void Sect Defense: VICTORY", { survivors: survivors.length });
            } else {
              const defeatEmbed = new EmbedBuilder()
                .setTitle("💀 DEFEAT! The Sect Falls...")
                .setDescription("The aliens overwhelmed our defenses...")
                .setColor(0x660000)
                .addFields({
                  name: "Consequences",
                  value: `Each defender loses:\n💎 500 Void Crystals\n⚠️ 1 Level XP loss`,
                  inline: false,
                });

              for (const survivor of survivors) {
                const newVC = Math.max(0, survivor.voidCrystals - 500);
                const newXP = Math.max(0, survivor.xp - 100);
                await storage.updateUser(survivor.id, {
                  voidCrystals: newVC,
                  xp: newXP,
                } as any);
              }

              await textChannel.send({ embeds: [defeatEmbed] }).catch(console.error);
              await this.logBotEvent(serverId, "Events", "⚔️ Void Sect Defense: DEFEAT", { survivors: survivors.length });
            }
          }

          this.activeEvents.set(serverId, Math.max(0, (this.activeEvents.get(serverId) || 1) - 1));
        }, 30000);
      }
    } catch (error) {
      console.error("Error in Void Sect Defense:", error);
    }
  }

  private async reportDailyActivity() {
    try {
      console.log("📊 Reporting daily activity...");
      const guilds = Array.from(this.client.guilds.cache.entries());

      for (const [serverId] of guilds) {
        const users = await storage.getUsersInServer(serverId);
        const disciples = users.filter(u => {
          const rank = u.rank || "Outer Disciple";
          return ["Outer Disciple", "Inner Disciple", "Core Disciple", "Inheritor Disciple"].includes(rank);
        });
        const elders = users.filter(u => {
          const rank = u.rank || "";
          return ["Heavenly Elder", "Great Elder", "Elder"].includes(rank);
        });

        const logMsg = `📊 Daily Activity Report:\n👥 Total Members: ${users.length}\n📚 Disciples: ${disciples.length}\n⚔️ Elders: ${elders.length}`;
        
        await this.logBotEvent(serverId, "Reports", logMsg, {
          date: new Date().toISOString(),
          totalMembers: users.length,
          discipleCount: disciples.length,
          elderCount: elders.length,
          topDiscipleXP: disciples.sort((a, b) => b.xp - a.xp)[0]?.username || "N/A",
          topElderXP: elders.sort((a, b) => b.xp - a.xp)[0]?.username || "N/A",
        });
      }

      console.log("✅ Daily activity report completed");
    } catch (error) {
      console.error("Error reporting daily activity:", error);
    }
  }

  private async generateConversationTopicIfNeeded(message: any) {
    try {
      if (!message.guildId || message.mentions.size > 0) return;
      
      const channel = message.channel as any;
      if (!channel.isTextBased()) return;

      const recentMessages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
      if (!recentMessages) return;

      const recentUserMessages = recentMessages.filter((m: any) => !m.author.bot && m.content.length > 0).size;
      
      if (recentUserMessages >= 2) return;
      if (Math.random() > 0.1) return;

      const xianxiaTopics = [
        "If you could choose any Xianxia cultivation bloodline, which would it be?",
        "What's your favorite Xianxia novel? Why?",
        "Tribulation Lightning or Heavenly Dao Test - which sounds more terrifying?",
        "What would your ideal sect look like?",
        "If you had to pick a cultivation realm to stay at forever, which would it be?",
        "What's the most interesting Xianxia artifact you've heard of?",
        "Would you rather cultivate alone or in a sect?",
        "What do you think is harder - maintaining power or achieving it?",
        "If you met a real immortal, what would you ask them?",
        "What's your favorite Xianxia character archetype?",
      ];

      const topic = xianxiaTopics[Math.floor(Math.random() * xianxiaTopics.length)];

      const embed = new EmbedBuilder()
        .setTitle("💭 Cultivator's Thought")
        .setDescription(topic)
        .setColor(0x9966ff)
        .setFooter({ text: "Feel free to share your thoughts!" })
        .setTimestamp();

      await channel.send({ embeds: [embed] }).catch(console.error);
    } catch (error) {
      console.error("Error generating conversation topic:", error);
    }
  }

  private async checkModerationRules(message: any) {
    try {
      if (message.author.bot || !message.guildId) return;

      const user = await storage.getUserByDiscordId(message.author.id, message.guildId);
      if (!user) return;

      const elderRanks = ["Elder", "Great Elder", "Heavenly Elder", "Supreme Sect Master"];
      if (user.rank && elderRanks.includes(user.rank)) return;

      const content = message.content.toLowerCase();
      let violation: { reason: string; description: string } | null = null;

      if (content.includes("http") && !content.includes("discord")) {
        violation = { reason: "advertising", description: "Posting external links/advertising" };
      } else if (message.mentions.size > 5) {
        violation = { reason: "spam", description: "Spam mentions (spam)" };
      } else if (content.length > 500 && content === content.toUpperCase()) {
        violation = { reason: "spam", description: "MASSIVE CAPS SPAM" };
      } else if (content.includes("cheat") || content.includes("hack") || content.includes("exploit")) {
        violation = { reason: "cheating", description: "Admitting to cheating/hacking" };
      } else if (
        content.includes("***") || content.includes("shit") || 
        content.includes("damn") || (content.includes("hate") && content.includes("user"))
      ) {
        violation = { reason: "insult", description: "Explicit insults or cursing" };
      }

      if (!violation) return;

      const existingStrikes = await storage.getUserStrikes(user.id);
      const strikeCount = existingStrikes.length + 1;

      if (strikeCount >= 3) {
        await message.reply({
          content: `❌ **${message.author.username}** - **EXPELLED FROM SECT!**\nStrike 3: ${violation.reason}\nYou have been permanently removed. Start over with /start.`,
        });
        
        await storage.updateUser(user.id, { rank: "Expelled" } as any);
        await storage.recordStrike(user.id, 3, violation.reason, violation.description, message.guildId);
        
        try {
          const member = await message.guild.members.fetch(message.author.id);
          const disciple = await message.guild.roles.cache.find(r => r.name.toLowerCase().includes("disciple"));
          if (disciple && member) {
            await member.roles.remove(disciple).catch(() => {});
          }
        } catch (e) {
          console.error("Error removing roles:", e);
        }

        await this.logBotEvent(message.guildId, "Moderation", `🚫 User EXPELLED: ${message.author.tag}`, {
          strikes: 3,
          reason: violation.reason,
          finalStrike: violation.description,
        });
      } else if (strikeCount === 2) {
        const banUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await message.reply({
          content: `⚠️ **${message.author.username}** - **STRIKE 2/3: TEMPORARY BAN**\nReason: ${violation.reason}\nYou are temporarily blocked until <t:${Math.floor(banUntil.getTime() / 1000)}:R>.`,
        });

        await storage.recordStrike(user.id, 2, violation.reason, violation.description, message.guildId, banUntil);

        try {
          const member = await message.guild.members.fetch(message.author.id);
          await member.timeout(24 * 60 * 60 * 1000, `Moderation: ${violation.reason}`).catch(() => {});
        } catch (e) {
          console.error("Error timing out user:", e);
        }

        await this.logBotEvent(message.guildId, "Moderation", `⚠️ Strike 2 (24h ban): ${message.author.tag}`, {
          reason: violation.reason,
          bannedUntil: banUntil.toISOString(),
        });
      } else {
        await message.reply({
          content: `⚠️ **${message.author.username}** - **WARNING (Strike 1/3)**\nReason: ${violation.reason} - ${violation.description}\n2 more strikes and you're expelled. Respect sect rules!`,
        });

        await storage.recordStrike(user.id, 1, violation.reason, violation.description, message.guildId);

        await this.logBotEvent(message.guildId, "Moderation", `⚠️ Strike 1: ${message.author.tag}`, {
          reason: violation.reason,
          description: violation.description,
        });
      }
    } catch (error) {
      console.error("Error in moderation check:", error);
    }
  }

  public async start() {
    if (!this.TOKEN) {
      console.error("❌ DISCORD_TOKEN not provided");
      throw new Error("Discord bot token not provided");
    }

    console.log("🤖 Starting Discord Bot...");
    console.log(`🔑 Token: ${this.TOKEN.substring(0, 15)}...`);

    await this.client.login(this.TOKEN);
  }
}

export const bot = new CultivationBot();
