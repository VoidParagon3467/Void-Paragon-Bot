import * as dotenv from "dotenv";
dotenv.config();
import { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { storage } from './storage';
import { cultivationService } from './cultivation';
import { missionService } from './missions';
import { cultivationRealms } from '@shared/schema';

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
    this.client.once('ready', () => {
      console.log(`✅ Bot is ready! Logged in as ${this.client.user?.tag}`);
    });
    
    this.client.on('guildMemberAdd', async (member) => {
      await this.handleNewMember(member);
    });
    
    this.client.on('messageCreate', async (message) => {
      if (message.author.bot) return;
      await this.handleChatXp(message);
    });
    
    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      console.log(`🎮 Executing: ${interaction.commandName} by ${interaction.user.tag}`);
      await this.handleSlashCommand(interaction);
    });

    this.client.on('error', error => {
      console.error('❌ Discord client error:', error);
    });
  }
  
  private async setupCommands() {
    const commands = [
      new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your cultivation profile'),
      
      new SlashCommandBuilder()
        .setName('cultivate')
        .setDescription('Attempt to advance your cultivation realm'),
      
      new SlashCommandBuilder()
        .setName('spar')
        .setDescription('Challenge another cultivator to a sparring match')
        .addUserOption(option =>
          option.setName('opponent')
            .setDescription('The cultivator you want to challenge')
            .setRequired(true)),
      
      new SlashCommandBuilder()
        .setName('faction')
        .setDescription('Faction management')
        .addSubcommand(subcommand =>
          subcommand.setName('create')
            .setDescription('Create a new faction')
            .addStringOption(option =>
              option.setName('name')
                .setDescription('Name of the faction')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('description')
                .setDescription('Description of the faction')
                .setRequired(false)))
        .addSubcommand(subcommand =>
          subcommand.setName('join')
            .setDescription('Join an existing faction')
            .addStringOption(option =>
              option.setName('name')
                .setDescription('Name of the faction to join')
                .setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand.setName('leave')
            .setDescription('Leave your current faction'))
        .addSubcommand(subcommand =>
          subcommand.setName('info')
            .setDescription('View faction information')),
      
      new SlashCommandBuilder()
        .setName('shop')
        .setDescription('View the cultivation shop'),
      
      new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('View your inventory'),
      
      new SlashCommandBuilder()
        .setName('missions')
        .setDescription('View your active missions'),
      
      new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the cultivation leaderboard'),
      
      new SlashCommandBuilder()
        .setName('rebirth')
        .setDescription('Undergo rebirth to start anew with bonuses'),
      
      new SlashCommandBuilder()
        .setName('look')
        .setDescription('Look around in the world'),
      
      new SlashCommandBuilder()
        .setName('breakthrough')
        .setDescription('Attempt a breakthrough to the next realm'),

      // Sect Master commands
      new SlashCommandBuilder()
        .setName('sectmaster')
        .setDescription('Sect Master divine powers')
        .addSubcommand(subcommand =>
          subcommand.setName('grant')
            .setDescription('Grant cultivation levels to a disciple')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('The disciple to grant levels to')
                .setRequired(true))
            .addIntegerOption(option =>
              option.setName('levels')
                .setDescription('Number of levels to grant')
                .setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand.setName('banish')
            .setDescription('Banish a cultivator from the sect')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('The cultivator to banish')
                .setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand.setName('event')
            .setDescription('Start a sect-wide event')
            .addStringOption(option =>
              option.setName('type')
                .setDescription('Type of event')
                .setRequired(true)
                .addChoices(
                  { name: 'Double XP', value: 'double_xp' },
                  { name: 'Faction War', value: 'faction_war' },
                  { name: 'Treasure Hunt', value: 'treasure_hunt' }
                ))),
    ];
    
    // Register commands when ready
    this.client.on('ready', async () => {
      const guild = this.client.guilds.cache.first();
      if (guild) {
        try {
          await guild.commands.set(commands.map(cmd => cmd.toJSON()));
          console.log(`✅ Registered ${commands.length} commands`);
        } catch (error) {
          console.error('❌ Failed to register commands:', error);
        }
      }
    });
  }
  
  private async handleNewMember(member: any) {
    const serverId = member.guild.id;
    const settings = await storage.getServerSettings(serverId);
    
    if (settings?.welcomeChannelId) {
      const channel = await this.client.channels.fetch(settings.welcomeChannelId);
      if (channel && channel.isTextBased()) {
        const embed = new EmbedBuilder()
          .setTitle('🌟 Welcome to the Cultivation Sect!')
          .setDescription(`Greetings, ${member.displayName}! Your journey to immortality begins now.`)
          .setColor(0x00D4FF)
          .addFields(
            { name: '🗡️ Getting Started', value: 'Use `/profile` to view your cultivation status' },
            { name: '💎 Earning Void Crystals', value: 'Chat in the server to gain XP and crystals' },
            { name: '⚔️ Battle System', value: 'Challenge others with `/spar @user`' },
            { name: '🏛️ Factions', value: 'Join or create factions with `/faction`' }
          )
          .setThumbnail(member.user.displayAvatarURL())
          .setTimestamp();
        
        await channel.send({ embeds: [embed] });
      }
    }
    
    // Create user profile
    try {
      await storage.createUser({
        discordId: member.user.id,
        username: member.displayName,
        avatar: member.user.displayAvatarURL(),
        serverId: serverId,
        realm: 'Connate',
        level: 1,
        xp: 0,
        power: 100,
        defense: 100,
        agility: 100,
        wisdom: 100,
        voidCrystals: 100, // Starting crystals
        inventory: [],
        factionId: null,
        factionRank: null,
        lifespan: 100000,
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  }
  
  private async handleChatXp(message: any) {
    const user = await storage.getUserByDiscordId(message.author.id, message.guild.id);
    if (!user) {
      // Create user on first message
      await storage.createUser({
        discordId: message.author.id,
        username: message.author.displayName,
        avatar: message.author.displayAvatarURL(),
        serverId: message.guild.id,
        realm: 'Connate',
        level: 1,
        xp: 0,
        power: 100,
        defense: 100,
        agility: 100,
        wisdom: 100,
        voidCrystals: 100,
        inventory: [],
        factionId: null,
        factionRank: null,
        lifespan: 100000,
      });
      return;
    }
    
    // Award chat XP
    const xpGain = Math.floor(Math.random() * 10) + 5; // 5-15 XP per message
    const newXp = user.xp + xpGain;
    const xpToNextLevel = 100 * user.level;
    
    if (newXp >= xpToNextLevel) {
      await storage.updateUser(user.id, {
        level: user.level + 1,
        xp: newXp - xpToNextLevel,
      });
    } else {
      await storage.updateUser(user.id, { xp: newXp });
    }
  }
  
  private async handleSlashCommand(interaction: any) {
    const { commandName } = interaction;
    
    try {
      switch (commandName) {
        case 'profile':
          await this.handleProfileCommand(interaction);
          break;
        case 'cultivate':
          await this.handleCultivateCommand(interaction);
          break;
        case 'breakthrough':
          await this.handleBreakthroughCommand(interaction);
          break;
        case 'spar':
          await this.handleSparCommand(interaction);
          break;
        case 'faction':
          await this.handleFactionCommand(interaction);
          break;
        case 'shop':
          await this.handleShopCommand(interaction);
          break;
        case 'inventory':
          await this.handleInventoryCommand(interaction);
          break;
        case 'missions':
          await this.handleMissionsCommand(interaction);
          break;
        case 'leaderboard':
          await this.handleLeaderboardCommand(interaction);
          break;
        case 'rebirth':
          await this.handleRebirthCommand(interaction);
          break;
        case 'look':
          await this.handleLookCommand(interaction);
          break;
        case 'sectmaster':
          await this.handleSectMasterCommand(interaction);
          break;
        default:
          await interaction.reply({ content: 'Unknown command!', ephemeral: true });
      }
    } catch (error) {
      console.error('❌ Error handling slash command:', error);
      await interaction.reply({ content: 'An error occurred while processing your command.', ephemeral: true }).catch(e => console.error('Failed to send error:', e));
    }
  }
  
  private async handleProfileCommand(interaction: any) {
    const user = await storage.getUserByDiscordId(interaction.user.id, interaction.guild.id);
    if (!user) {
      await interaction.reply({ content: 'You are not registered. Creating profile...', ephemeral: true });
      await storage.createUser({
        discordId: interaction.user.id,
        username: interaction.user.displayName,
        avatar: interaction.user.displayAvatarURL(),
        serverId: interaction.guild.id,
        realm: 'Connate',
        level: 1,
        xp: 0,
        power: 100,
        defense: 100,
        agility: 100,
        wisdom: 100,
        voidCrystals: 100,
        inventory: [],
        factionId: null,
        factionRank: null,
        lifespan: 100000,
      });
      return;
    }
    
    const embed = new EmbedBuilder()
      .setTitle(`⚔️ ${user.username}'s Cultivation Profile`)
      .setColor(0x00D4FF)
      .addFields(
        { name: '🏔️ Realm', value: user.realm, inline: true },
        { name: '📊 Level', value: user.level.toString(), inline: true },
        { name: '💪 Power', value: user.power.toString(), inline: true },
        { name: '🛡️ Defense', value: user.defense.toString(), inline: true },
        { name: '⚡ Agility', value: user.agility.toString(), inline: true },
        { name: '🧠 Wisdom', value: user.wisdom.toString(), inline: true },
        { name: '📈 XP Progress', value: `${user.xp} / ${100 * user.level}`, inline: true },
        { name: '💎 Void Crystals', value: user.voidCrystals.toString(), inline: true },
        { name: '⏳ Lifespan', value: `${user.lifespan} years`, inline: true }
      )
      .setThumbnail(user.avatar || interaction.user.displayAvatarURL())
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
  
  private async handleCultivateCommand(interaction: any) {
    const user = await storage.getUserByDiscordId(interaction.user.id, interaction.guild.id);
    if (!user) {
      await interaction.reply({ content: 'You are not registered.', ephemeral: true });
      return;
    }
    
    const success = Math.random() > 0.3; // 70% success rate
    const xpGain = Math.floor(Math.random() * 50) + 50;
    
    if (success) {
      const newXp = user.xp + xpGain;
      await storage.updateUser(user.id, { xp: newXp });
      
      const embed = new EmbedBuilder()
        .setTitle('✨ Cultivation Success!')
        .setDescription(`You have successfully cultivated and gained ${xpGain} XP!`)
        .setColor(0x00FF88)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } else {
      const embed = new EmbedBuilder()
        .setTitle('⚠️ Cultivation Failed')
        .setDescription('Your cultivation attempt was unsuccessful. Try again!')
        .setColor(0xFF8800)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    }
  }
  
  private async handleBreakthroughCommand(interaction: any) {
    const user = await storage.getUserByDiscordId(interaction.user.id, interaction.guild.id);
    if (!user) {
      await interaction.reply({ content: 'You are not registered.', ephemeral: true });
      return;
    }
    
    const realms = ['Connate', 'Qi Gathering', 'Foundation', 'Core', 'Nascent Soul', 'Immortal Ascension'];
    const currentRealmIndex = realms.indexOf(user.realm);
    
    if (currentRealmIndex === -1 || currentRealmIndex >= realms.length - 1) {
      await interaction.reply({ content: 'You cannot breakthrough further!', ephemeral: true });
      return;
    }
    
    const success = Math.random() > 0.4; // 60% success rate
    
    if (success) {
      const nextRealm = realms[currentRealmIndex + 1];
      await storage.updateUser(user.id, { 
        realm: nextRealm,
        xp: 0,
        power: user.power + 50,
        defense: user.defense + 50,
        agility: user.agility + 50,
        wisdom: user.wisdom + 50,
      });
      
      const embed = new EmbedBuilder()
        .setTitle('🌟 Breakthrough Successful!')
        .setDescription(`You have advanced to ${nextRealm}!`)
        .setColor(0xFFD700)
        .addFields(
          { name: 'New Realm', value: nextRealm, inline: true },
          { name: 'Stats Increased', value: '+50 to all stats', inline: true }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } else {
      const embed = new EmbedBuilder()
        .setTitle('💥 Breakthrough Failed!')
        .setDescription('You were not ready for this breakthrough. Your power was insufficient.')
        .setColor(0xFF4444)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    }
  }
  
  private async handleLookCommand(interaction: any) {
    const locations = [
      'You see a peaceful valley with flowing rivers.',
      'A misty mountain peak looms in the distance.',
      'An ancient temple stands before you, shrouded in mystery.',
      'Wild beasts roam the untamed wilderness around you.',
      'A bustling city marketplace fills the air with sounds of commerce.'
    ];
    
    const location = locations[Math.floor(Math.random() * locations.length)];
    
    const embed = new EmbedBuilder()
      .setTitle('👀 You Look Around')
      .setDescription(location)
      .setColor(0x00D4FF)
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
  
  private async handleSparCommand(interaction: any) {
    const user = await storage.getUserByDiscordId(interaction.user.id, interaction.guild.id);
    if (!user) {
      await interaction.reply({ content: 'You are not registered.', ephemeral: true });
      return;
    }
    
    const opponent = interaction.options.getUser('opponent');
    const opponentUser = await storage.getUserByDiscordId(opponent.id, interaction.guild.id);
    
    if (!opponentUser) {
      await interaction.reply({ content: `${opponent.username} is not registered.`, ephemeral: true });
      return;
    }
    
    const userWins = Math.random() * (user.power + user.agility) > Math.random() * (opponentUser.power + opponentUser.agility);
    
    const embed = new EmbedBuilder()
      .setTitle('⚔️ Sparring Match')
      .setDescription(`${user.username} vs ${opponent.username}`)
      .setColor(userWins ? 0x00FF88 : 0xFF8800)
      .addFields(
        { name: 'Winner', value: userWins ? user.username : opponent.username, inline: false },
        { name: `${user.username}'s Power`, value: user.power.toString(), inline: true },
        { name: `${opponent.username}'s Power`, value: opponentUser.power.toString(), inline: true }
      )
      .setTimestamp();
    
    if (userWins) {
      await storage.updateUser(user.id, { 
        xp: user.xp + 50,
        voidCrystals: user.voidCrystals + 10
      });
    }
    
    await interaction.reply({ embeds: [embed] });
  }
  
  private async handleFactionCommand(interaction: any) {
    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
      case 'create':
        await this.handleCreateFaction(interaction);
        break;
      case 'join':
        await this.handleJoinFaction(interaction);
        break;
      case 'leave':
        await this.handleLeaveFaction(interaction);
        break;
      case 'info':
        await this.handleFactionInfo(interaction);
        break;
    }
  }
  
  private async handleCreateFaction(interaction: any) {
    const user = await storage.getUserByDiscordId(interaction.user.id, interaction.guild.id);
    if (!user) {
      await interaction.reply({ content: 'You are not registered.', ephemeral: true });
      return;
    }
    
    const name = interaction.options.getString('name');
    const description = interaction.options.getString('description') || 'No description';
    
    const faction = await storage.createFaction({
      name,
      description,
      leaderId: user.id,
      memberCount: 1,
      warPoints: 0,
      createdAt: new Date(),
    });
    
    await storage.updateUser(user.id, { 
      factionId: faction.id,
      factionRank: 'Leader'
    });
    
    const embed = new EmbedBuilder()
      .setTitle('🏛️ Faction Created')
      .setDescription(`${name} has been founded!`)
      .setColor(0x00D4FF)
      .addFields(
        { name: 'Description', value: description, inline: false },
        { name: 'Your Rank', value: 'Leader', inline: true }
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
  
  private async handleJoinFaction(interaction: any) {
    const user = await storage.getUserByDiscordId(interaction.user.id, interaction.guild.id);
    if (!user) {
      await interaction.reply({ content: 'You are not registered.', ephemeral: true });
      return;
    }
    
    const factionName = interaction.options.getString('name');
    const faction = await storage.getFactionByName(factionName);
    
    if (!faction) {
      await interaction.reply({ content: `Faction "${factionName}" not found.`, ephemeral: true });
      return;
    }
    
    await storage.updateUser(user.id, { 
      factionId: faction.id,
      factionRank: 'Member'
    });
    
    const embed = new EmbedBuilder()
      .setTitle('🏛️ Faction Joined')
      .setDescription(`You have joined ${faction.name}!`)
      .setColor(0x00D4FF)
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
  
  private async handleLeaveFaction(interaction: any) {
    const user = await storage.getUserByDiscordId(interaction.user.id, interaction.guild.id);
    if (!user) {
      await interaction.reply({ content: 'You are not registered.', ephemeral: true });
      return;
    }
    
    if (!user.factionId) {
      await interaction.reply({ content: 'You are not in a faction.', ephemeral: true });
      return;
    }
    
    const faction = await storage.getFactionById(user.factionId);
    await storage.leaveFaction(user.id);
    
    const embed = new EmbedBuilder()
      .setTitle('🏛️ Faction Left')
      .setDescription(`You have left ${faction?.name || 'the faction'}.`)
      .setColor(0xFF4444)
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
  
  private async handleFactionInfo(interaction: any) {
    const user = await storage.getUserByDiscordId(interaction.user.id, interaction.guild.id);
    if (!user) {
      await interaction.reply({ content: 'You are not registered.', ephemeral: true });
      return;
    }
    
    if (!user.factionId) {
      await interaction.reply({ content: 'You are not in a faction.', ephemeral: true });
      return;
    }
    
    const faction = await storage.getFactionById(user.factionId);
    if (!faction) {
      await interaction.reply({ content: 'Faction not found.', ephemeral: true });
      return;
    }
    
    const embed = new EmbedBuilder()
      .setTitle(`🏛️ ${faction.name}`)
      .setDescription(faction.description || 'No description provided')
      .setColor(0x00D4FF)
      .addFields(
        { name: 'Members', value: faction.memberCount.toString(), inline: true },
        { name: 'War Points', value: faction.warPoints.toString(), inline: true },
        { name: 'Your Rank', value: user.factionRank || 'Member', inline: true }
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
  
  private async handleShopCommand(interaction: any) {
    const items = await storage.getItems();
    const shopItems = items.slice(0, 10);
    
    const embed = new EmbedBuilder()
      .setTitle('🏪 Cultivation Shop')
      .setDescription('Purchase items with Void Crystals')
      .setColor(0x00D4FF);
    
    if (shopItems.length === 0) {
      embed.setDescription('Shop is empty!');
    } else {
      shopItems.forEach(item => {
        embed.addFields({
          name: `${item.name} (${item.rarity})`,
          value: `${item.description}\n💎 Price: ${item.price}`,
          inline: true
        });
      });
    }
    
    await interaction.reply({ embeds: [embed] });
  }
  
  private async handleInventoryCommand(interaction: any) {
    const user = await storage.getUserByDiscordId(interaction.user.id, interaction.guild.id);
    if (!user) {
      await interaction.reply({ content: 'You are not registered.', ephemeral: true });
      return;
    }
    
    const items = await storage.getUserItems(user.id);
    
    const embed = new EmbedBuilder()
      .setTitle('🎒 Your Inventory')
      .setColor(0x00D4FF);
    
    if (items.length === 0) {
      embed.setDescription('Your inventory is empty. Visit the shop to purchase items!');
    } else {
      items.forEach(userItem => {
        embed.addFields({
          name: `${userItem.item.name} ${userItem.isEquipped ? '(Equipped)' : ''}`,
          value: `${userItem.item.description}\nQuantity: ${userItem.quantity}`,
          inline: true
        });
      });
    }
    
    await interaction.reply({ embeds: [embed] });
  }
  
  private async handleMissionsCommand(interaction: any) {
    const user = await storage.getUserByDiscordId(interaction.user.id, interaction.guild.id);
    if (!user) {
      await interaction.reply({ content: 'You are not registered.', ephemeral: true });
      return;
    }
    
    const missions = await storage.getUserMissions(user.id);
    const activeMissions = missions.filter((m: any) => m.status === 'active');
    
    const embed = new EmbedBuilder()
      .setTitle('📋 Your Missions')
      .setColor(0x00D4FF);
    
    if (activeMissions.length === 0) {
      embed.setDescription('No active missions. New missions will be assigned automatically!');
    } else {
      activeMissions.forEach((userMission: any) => {
        const mission = userMission.mission;
        embed.addFields({
          name: `${mission.title} (${mission.type})`,
          value: `${mission.description}\n⭐ XP: ${mission.xpReward} | 💎 Reward: ${mission.crystalReward}`,
          inline: false
        });
      });
    }
    
    await interaction.reply({ embeds: [embed] });
  }
  
  private async handleLeaderboardCommand(interaction: any) {
    const leaderboard = await storage.getLeaderboard(interaction.guild.id, 10);
    
    const embed = new EmbedBuilder()
      .setTitle('🏆 Cultivation Leaderboard')
      .setColor(0xFFD700)
      .setDescription('Top 10 Cultivators by Power');
    
    if (leaderboard.length === 0) {
      embed.setDescription('No cultivators yet!');
    } else {
      leaderboard.forEach((user: any, index: number) => {
        embed.addFields({
          name: `${index + 1}. ${user.username}`,
          value: `${user.realm} - Level ${user.level}\n💪 Power: ${user.power}`,
          inline: false
        });
      });
    }
    
    await interaction.reply({ embeds: [embed] });
  }
  
  private async handleRebirthCommand(interaction: any) {
    const user = await storage.getUserByDiscordId(interaction.user.id, interaction.guild.id);
    if (!user) {
      await interaction.reply({ content: 'You are not registered.', ephemeral: true });
      return;
    }
    
    if (user.level < 50) {
      await interaction.reply({ content: 'You must be level 50 to rebirth!', ephemeral: true });
      return;
    }
    
    const bonus = Math.floor(user.power * 0.1);
    
    await storage.updateUser(user.id, {
      level: 1,
      xp: 0,
      realm: 'Connate',
      power: 100 + bonus,
      defense: 100 + bonus,
      agility: 100 + bonus,
      wisdom: 100 + bonus,
      lifespan: user.lifespan + 1000,
    });
    
    const embed = new EmbedBuilder()
      .setTitle('🔄 Rebirth Complete!')
      .setDescription('You have been reborn with enhanced power!')
      .setColor(0xFF00FF)
      .addFields(
        { name: 'Bonus Power', value: `+${bonus}`, inline: true },
        { name: 'New Lifespan', value: `${user.lifespan + 1000} years`, inline: true },
        { name: 'Starting Level', value: '1', inline: true }
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
  
  private async handleSectMasterCommand(interaction: any) {
    // Only sect masters can use this
    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
      case 'grant':
        await this.handleGrantCommand(interaction);
        break;
      case 'banish':
        await this.handleBanishCommand(interaction);
        break;
      case 'event':
        await this.handleStartEvent(interaction);
        break;
    }
  }
  
  private async handleGrantCommand(interaction: any) {
    const targetUser = interaction.options.getUser('user');
    const levels = interaction.options.getInteger('levels');
    
    const user = await storage.getUserByDiscordId(targetUser.id, interaction.guild.id);
    if (!user) {
      await interaction.reply({ content: 'User not found.', ephemeral: true });
      return;
    }
    
    await storage.updateUser(user.id, {
      level: user.level + levels,
      xp: 0,
    });
    
    const embed = new EmbedBuilder()
      .setTitle('⚡ Divine Grant!')
      .setDescription(`The Sect Master has granted ${levels} levels to ${targetUser.displayName}!`)
      .setColor(0x00FF88)
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
  
  private async handleBanishCommand(interaction: any) {
    const targetUser = interaction.options.getUser('user');
    const user = await storage.getUserByDiscordId(targetUser.id, interaction.guild.id);
    
    if (!user) {
      await interaction.reply({ content: 'User not found.', ephemeral: true });
      return;
    }
    
    await storage.updateUser(user.id, {
      realm: 'Connate',
      level: 1,
      xp: 0,
      power: 50,
      defense: 50,
      agility: 50,
      wisdom: 50,
      xp: 0,
      voidCrystals: 0,
    });
    
    const embed = new EmbedBuilder()
      .setTitle('⚡ Divine Punishment!')
      .setDescription(`The Sect Master has banished ${targetUser.displayName} back to the Connate realm!`)
      .setColor(0xFF4444)
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
  
  private async handleStartEvent(interaction: any) {
    const eventType = interaction.options.getString('type');
    
    const embed = new EmbedBuilder()
      .setTitle('🎉 Sect-Wide Event Started!')
      .setColor(0x00FF88)
      .setTimestamp();
    
    switch (eventType) {
      case 'double_xp':
        embed.setDescription('Double XP event is now active! All cultivation activities reward double XP for the next 24 hours!');
        break;
      case 'faction_war':
        embed.setDescription('Faction War has begun! Factions can now battle for supremacy and war points!');
        break;
      case 'treasure_hunt':
        embed.setDescription('Treasure Hunt event is active! Complete missions to find rare treasures!');
        break;
    }
    
    await interaction.reply({ embeds: [embed] });
  }
  
  public async start() {
    if (!this.TOKEN) {
      console.error('❌ DISCORD_TOKEN not provided');
      throw new Error('Discord bot token not provided');
    }
    
    console.log('🤖 Starting Discord Bot...');
    console.log(`🔑 Token: ${this.TOKEN.substring(0, 15)}...`);
    
    await this.client.login(this.TOKEN);
  }
}

export const bot = new CultivationBot();

// Auto-start the bot
bot.start().catch(err => {
  console.error('❌ Failed to start bot:', err.message);
  process.exit(1);
});
