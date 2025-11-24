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
import { cultivationRealms } from "@shared/schema";

export class CultivationBot {
  private client: Client;
  private readonly TOKEN = process.env.DISCORD_TOKEN;

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

  private setupEventHandlers() {
    this.client.on("ready", () => {
      console.log(`✅ Bot is ready! Logged in as ${this.client.user?.tag}`);
      this.startAutomaticSystems();
    });

    this.client.on("guildMemberAdd", async (member) => {
      await this.handleNewMember(member);
    });

    this.client.on("messageCreate", async (message) => {
      if (message.author.bot) return;
      await this.handleChatXp(message);
    });

    this.client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      console.log(`🎮 Executing: ${interaction.commandName} by ${interaction.user.tag}`);
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
    
    // Auto-generate treasures every 6 hours
    setInterval(() => this.autoGenerateTreasures(), 6 * 60 * 60 * 1000);
    
    // Bloodline generation for premium users every 12 hours
    setInterval(() => this.autoGenerateBloodlines(), 12 * 60 * 60 * 1000);
    
    // Random events every 4 hours
    setInterval(() => this.triggerRandomEvent(), 4 * 60 * 60 * 1000);

    // Also run these immediately on startup
    this.distributeDailyResources().catch(console.error);
    this.autoGenerateTreasures().catch(console.error);
    this.autoGenerateBloodlines().catch(console.error);
  }

  private async distributeDailyResources() {
    try {
      console.log("📦 Distributing daily resources...");
      const guilds = Array.from(this.client.guilds.cache.entries());

      for (const [serverId] of guilds) {
        const users = await storage.getUsersInServer(serverId);

        for (const userRecord of users) {
          // Skip supreme sect master - they already have infinite
          if (userRecord.isSupremeSectMaster) continue;
          
          const voidCrystalsReward = 50 * userRecord.level;
          // Spirit Points VERY RARE - only 10% of void crystals (kept sparse)
          const spiritPointsReward = Math.floor(voidCrystalsReward * 0.1);
          // Karma EXCEEDINGLY RARE - only 1-3 max per day
          const karmaReward = Math.floor(Math.random() * 3) + 1;
          
          await storage.updateUser(userRecord.id, {
            voidCrystals: userRecord.voidCrystals + voidCrystalsReward,
            spiritPoints: userRecord.spiritPoints + spiritPointsReward,
            karma: userRecord.karma + karmaReward,
          } as any);
        }

        // Announce in general or first text channel
        const channels = this.client.guilds.cache.get(serverId)?.channels.cache;
        if (channels) {
          const textChannel = channels.find((c: any) => c.isTextBased()) as any;
          if (textChannel && 'send' in textChannel) {
            const embed = new EmbedBuilder()
              .setTitle("🌅 Daily Resources Distributed!")
              .setDescription(`All cultivators have received their daily resources!`)
              .setColor(0x00ff88)
              .addFields({
                name: "Rewards (Per Player)",
                value: `💎 50 × Level Void Crystals\n✨ 5 × Level Spirit Points (Very Rare)\n⭐ 1-3 Karma (Exceedingly Rare)`,
              })
              .setTimestamp();

            await (textChannel as any).send({ embeds: [embed] }).catch(console.error);
          }
        }
      }
    } catch (error) {
      console.error("Error distributing daily resources:", error);
    }
  }

  private async autoGenerateTreasures() {
    try {
      console.log("✨ Auto-generating treasures...");
      const rarities = ["common", "uncommon", "rare", "epic", "legendary"];
      const treasureNames = [
        "Spirit Stone",
        "Heaven Pill",
        "Void Shard",
        "Dragon Scale",
        "Phoenix Feather",
        "Celestial Pearl",
        "Demon Blood",
        "God Core",
        "Infinite Jade",
        "Soul Essence",
      ];

      // Generate 3-5 random treasures
      const count = Math.floor(Math.random() * 3) + 3;
      const generatedTreasures = [];

      for (let i = 0; i < count; i++) {
        const rarity = rarities[Math.floor(Math.random() * rarities.length)];
        const name = treasureNames[Math.floor(Math.random() * treasureNames.length)];
        const priceMultiplier = { common: 100, uncommon: 250, rare: 500, epic: 1500, legendary: 5000 };
        const price = priceMultiplier[rarity as keyof typeof priceMultiplier] || 100;

        const item = await storage.createItem({
          name: `${name} (${rarity})`,
          type: "treasure",
          rarity,
          description: `A rare treasure from the void`,
          price,
          powerBonus: Math.floor(Math.random() * 50) + 10,
          defenseBonus: Math.floor(Math.random() * 30) + 5,
          agilityBonus: Math.floor(Math.random() * 20) + 5,
          wisdomBonus: Math.floor(Math.random() * 25) + 5,
        } as any);

        generatedTreasures.push(item);
      }

      // Announce rare treasures in all servers
      const guilds = Array.from(this.client.guilds.cache.entries());
      for (const [serverId] of guilds) {
        const channels = this.client.guilds.cache.get(serverId)?.channels.cache;
        if (channels) {
          // Find announcement or general channel
          let targetChannel = channels.find((c: any) => c.name === "announcements" && c.isTextBased()) as any;
          if (!targetChannel) {
            targetChannel = channels.find((c: any) => c.isTextBased()) as any;
          }

          if (targetChannel && 'send' in targetChannel) {
            for (const treasure of generatedTreasures) {
              if (treasure.rarity === "epic" || treasure.rarity === "legendary") {
                const embed = new EmbedBuilder()
                  .setTitle(`🏆 RARE TREASURE ALERT!`)
                  .setDescription(`A legendary treasure has appeared in the shop!`)
                  .setColor(treasure.rarity === "legendary" ? 0xffd700 : 0xff6600)
                  .addFields(
                    { name: "Item", value: treasure.name, inline: false },
                    { name: "Rarity", value: treasure.rarity.toUpperCase(), inline: true },
                    { name: "Price", value: `${treasure.price} Void Crystals`, inline: true },
                    {
                      name: "Stats",
                      value: `Power +${treasure.powerBonus} | Defense +${treasure.defenseBonus}`,
                      inline: false,
                    }
                  )
                  .setTimestamp();

                await (targetChannel as any).send({ embeds: [embed] }).catch(console.error);
              }
            }
          }
        }
      }

      console.log(`✨ Generated ${generatedTreasures.length} treasures`);
    } catch (error) {
      console.error("Error generating treasures:", error);
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
          message: "The heavens bless you! All cultivators gain 1000 spirit points!",
          reward: "spirit_points",
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
                case "spirit_points":
                  // Spirit Points VERY RARE - 50-100 MAX
                  updates.spiritPoints = eventUser.spiritPoints + (Math.floor(Math.random() * 50) + 50);
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
      const user = await storage.getUserByDiscordId(
        member.user.id,
        member.guild.id
      );
      if (!user) {
        await storage.createUser({
          discordId: member.user.id,
          username: member.user.username,
          avatar: member.user.displayAvatarURL(),
          serverId: member.guild.id,
        } as any);
      }

      // Send welcome message
      const channels = member.guild.channels.cache;
      const textChannel = channels.find((c: any) => c.isTextBased() && !c.isDMBased()) as any;
      
      if (textChannel && 'send' in textChannel) {
        const welcomeEmbed = new EmbedBuilder()
          .setTitle("🙏 Welcome to the Void Sect!")
          .setDescription(`Welcome, new disciple **${member.user.username}**! 🌟\n\nYou have entered the legendary Void Sect. Begin your cultivation journey and ascend through 25 realms of power!`)
          .setColor(0x9966ff)
          .addFields(
            { name: "Getting Started", value: "Use `/profile` to see your status\nUse `/cultivate` to gain XP\nUse `/breakthrough` when ready to advance realms", inline: false },
            { name: "Daily Rewards", value: "Receive void crystals daily for login\nParticipate in events for rare treasures\nBuild your power steadily", inline: false },
            { name: "Commands Available", value: "Type `/` to see all available commands", inline: false }
          )
          .setThumbnail(member.user.displayAvatarURL())
          .setTimestamp();

        await textChannel.send({ content: `Welcome, <@${member.user.id}>!`, embeds: [welcomeEmbed] }).catch(console.error);
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
        default:
          await interaction.reply({
            content: "Unknown command!",
            ephemeral: true,
          });
      }
    } catch (error) {
      console.error("❌ Error handling slash command:", error);
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
            realm: "True God Realm",
            level: 9,
            xp: 999999,
            voidCrystals: 999999999,
            spiritPoints: 999999,
            karma: 999999,
            fate: 999999,
          }),
        } as any);
      } else if (user.discordId === "1344237246240391272" && !user.isSupremeSectMaster) {
        // Update existing user to supreme sect master status
        user = (await storage.updateUser(user.id, {
          isSupremeSectMaster: true,
          realm: "True God Realm",
          level: 9,
          xp: 999999,
          voidCrystals: 999999999,
          spiritPoints: 999999,
          karma: 999999,
          fate: 999999,
        } as any)) as any;
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

      const embed = new EmbedBuilder()
        .setTitle(`⚔️ ${user.username}'s Cultivation Profile`)
        .setColor(0x00d4ff)
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
            value: `${user.xp} / ${100 * user.level}`,
            inline: true,
          },
          {
            name: "💎 Void Crystals",
            value: user.voidCrystals.toString(),
            inline: true,
          },
          {
            name: "✨ Spirit Points",
            value: user.spiritPoints.toString(),
            inline: true,
          },
          {
            name: "🔄 Rebirth Count",
            value: user.rebirthCount.toString(),
            inline: true,
          },
          { name: "✅ Karma", value: user.karma.toString(), inline: true },
          { name: "🎯 Fate", value: user.fate.toString(), inline: true }
        )
        .setThumbnail(user.avatar || interaction.user.displayAvatarURL())
        .setTimestamp();

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

      const success = Math.random() > 0.3;
      const xpGain = Math.floor(Math.random() * 50) + 50;

      if (success) {
        const newXp = user.xp + xpGain;
        await storage.updateUser(user.id, { xp: newXp } as any);

        const embed = new EmbedBuilder()
          .setTitle("✨ Cultivation Success!")
          .setDescription(
            `You have successfully cultivated and gained ${xpGain} XP!`
          )
          .setColor(0x00ff88)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle("⚠️ Cultivation Failed")
          .setDescription("Your cultivation attempt was unsuccessful. Try again!")
          .setColor(0xff8800)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      console.error("Error in handleCultivateCommand:", error);
      await interaction.editReply({
        content: "Error during cultivation.",
      });
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
            value: `Void Crystals: ${user.voidCrystals}\nSpirit Points: ${
              user.spiritPoints
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
        spiritPoints: user.spiritPoints + 100,
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
            name: "Bonus Spirit Points",
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
