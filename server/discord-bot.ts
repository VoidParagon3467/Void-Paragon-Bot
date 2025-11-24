import * as dotenv from "dotenv";
dotenv.config();
import { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { storage } from './storage';
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
        .setDescription('Cultivate to increase XP'),
      
      new SlashCommandBuilder()
        .setName('breakthrough')
        .setDescription('Attempt a breakthrough to the next realm'),
      
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
                .setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand.setName('join')
            .setDescription('Join an existing faction')
            .addIntegerOption(option =>
              option.setName('faction_id')
                .setDescription('Faction ID to join')
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
        .setName('buy')
        .setDescription('Buy an item from the shop')
        .addIntegerOption(option =>
          option.setName('item_id')
            .setDescription('Item ID to purchase')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('quantity')
            .setDescription('Quantity to buy')
            .setRequired(false)),
      
      new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('View your inventory'),
      
      new SlashCommandBuilder()
        .setName('equip')
        .setDescription('Equip an item')
        .addIntegerOption(option =>
          option.setName('item_id')
            .setDescription('Item ID to equip')
            .setRequired(true)),
      
      new SlashCommandBuilder()
        .setName('missions')
        .setDescription('View your active missions'),
      
      new SlashCommandBuilder()
        .setName('complete_mission')
        .setDescription('Complete a mission')
        .addIntegerOption(option =>
          option.setName('mission_id')
            .setDescription('Mission ID to complete')
            .setRequired(true)),
      
      new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the cultivation leaderboard')
        .addStringOption(option =>
          option.setName('sort_by')
            .setDescription('Sort by')
            .addChoices(
              { name: 'Realm', value: 'realm' },
              { name: 'Level', value: 'level' },
              { name: 'Void Crystals', value: 'crystals' },
              { name: 'Rebirth Count', value: 'rebirth' }
            )),
      
      new SlashCommandBuilder()
        .setName('rebirth')
        .setDescription('Undergo rebirth to start anew with bonuses'),
      
      new SlashCommandBuilder()
        .setName('look')
        .setDescription('Look around in the world'),
      
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
            .setDescription('Banish a cultivator back to Connate')
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
      
      new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View detailed cultivation stats'),
      
      new SlashCommandBuilder()
        .setName('bloodline')
        .setDescription('View your bloodline'),
      
      new SlashCommandBuilder()
        .setName('trade')
        .setDescription('Trade items with another player')
        .addUserOption(option =>
          option.setName('player')
            .setDescription('Player to trade with')
            .setRequired(true)),
    ];
    
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
    try {
      const user = await storage.getUserByDiscordId(member.user.id);
      if (!user) {
        await storage.createUser({
          discordId: member.user.id,
          username: member.user.username,
          avatar: member.user.displayAvatarURL(),
          serverId: member.guild.id,
        });
      }
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  }
  
  private async handleChatXp(message: any) {
    try {
      const user = await storage.getUserByDiscordId(message.author.id);
      if (!user) {
        await storage.createUser({
          discordId: message.author.id,
          username: message.author.username,
          avatar: message.author.displayAvatarURL(),
          serverId: message.guild.id,
        });
        return;
      }
      
      const xpGain = Math.floor(Math.random() * 10) + 5;
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
    } catch (error) {
      console.error('Error handling chat XP:', error);
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
        case 'buy':
          await this.handleBuyCommand(interaction);
          break;
        case 'inventory':
          await this.handleInventoryCommand(interaction);
          break;
        case 'equip':
          await this.handleEquipCommand(interaction);
          break;
        case 'missions':
          await this.handleMissionsCommand(interaction);
          break;
        case 'complete_mission':
          await this.handleCompleteMissionCommand(interaction);
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
        case 'stats':
          await this.handleStatsCommand(interaction);
          break;
        case 'bloodline':
          await this.handleBloodlineCommand(interaction);
          break;
        case 'trade':
          await this.handleTradeCommand(interaction);
          break;
        case 'sectmaster':
          await this.handleSectMasterCommand(interaction);
          break;
        default:
          await interaction.reply({ content: 'Unknown command!', ephemeral: true });
      }
    } catch (error) {
      console.error('❌ Error handling slash command:', error);
      try {
        await interaction.reply({ content: 'An error occurred while processing your command.', ephemeral: true });
      } catch (e) {
        console.error('Failed to send error reply:', e);
      }
    }
  }
  
  private async handleProfileCommand(interaction: any) {
    try {
      const user = await storage.getUserByDiscordId(interaction.user.id);
      if (!user) {
        await interaction.reply({ content: 'You are not registered. Creating profile...', ephemeral: true });
        await storage.createUser({
          discordId: interaction.user.id,
          username: interaction.user.username,
          avatar: interaction.user.displayAvatarURL(),
          serverId: interaction.guild.id,
        });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle(`⚔️ ${user.username}'s Cultivation Profile`)
        .setColor(0x00D4FF)
        .addFields(
          { name: '🏔️ Realm', value: user.realm, inline: true },
          { name: '📊 Level', value: user.level.toString(), inline: true },
          { name: '⭐ Rank', value: user.rank, inline: true },
          { name: '📈 XP Progress', value: `${user.xp} / ${100 * user.level}`, inline: true },
          { name: '💎 Void Crystals', value: user.voidCrystals.toString(), inline: true },
          { name: '✨ Spirit Points', value: user.spiritPoints.toString(), inline: true },
          { name: '🔄 Rebirth Count', value: user.rebirthCount.toString(), inline: true },
          { name: '✅ Karma', value: user.karma.toString(), inline: true },
          { name: '🎯 Fate', value: user.fate.toString(), inline: true }
        )
        .setThumbnail(user.avatar || interaction.user.displayAvatarURL())
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({ content: 'Error fetching profile.', ephemeral: true });
    }
  }
  
  private async handleCultivateCommand(interaction: any) {
    try {
      const user = await storage.getUserByDiscordId(interaction.user.id);
      if (!user) {
        await interaction.reply({ content: 'You are not registered.', ephemeral: true });
        return;
      }
      
      const success = Math.random() > 0.3;
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
    } catch (error) {
      await interaction.reply({ content: 'Error during cultivation.', ephemeral: true });
    }
  }
  
  private async handleBreakthroughCommand(interaction: any) {
    try {
      const user = await storage.getUserByDiscordId(interaction.user.id);
      if (!user) {
        await interaction.reply({ content: 'You are not registered.', ephemeral: true });
        return;
      }
      
      const currentRealmIndex = cultivationRealms.indexOf(user.realm as any);
      
      if (currentRealmIndex === -1 || currentRealmIndex >= cultivationRealms.length - 1) {
        await interaction.reply({ content: 'You cannot breakthrough further!', ephemeral: true });
        return;
      }
      
      if (user.level < 9) {
        await interaction.reply({ content: 'You must reach level 9 to breakthrough!', ephemeral: true });
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
        });
        
        const embed = new EmbedBuilder()
          .setTitle('🌟 Breakthrough Successful!')
          .setDescription(`You have advanced to ${nextRealm}!`)
          .setColor(0xFFD700)
          .addFields(
            { name: 'New Realm', value: nextRealm, inline: true },
            { name: 'Bonus Crystals', value: '+100', inline: true }
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
    } catch (error) {
      await interaction.reply({ content: 'Error during breakthrough.', ephemeral: true });
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
    try {
      const user = await storage.getUserByDiscordId(interaction.user.id);
      if (!user) {
        await interaction.reply({ content: 'You are not registered.', ephemeral: true });
        return;
      }
      
      const opponent = interaction.options.getUser('opponent');
      const opponentUser = await storage.getUserByDiscordId(opponent.id);
      
      if (!opponentUser) {
        await interaction.reply({ content: `${opponent.username} is not registered.`, ephemeral: true });
        return;
      }
      
      const userWins = Math.random() * user.level > Math.random() * opponentUser.level;
      
      const embed = new EmbedBuilder()
        .setTitle('⚔️ Sparring Match')
        .setDescription(`${user.username} vs ${opponent.username}`)
        .setColor(userWins ? 0x00FF88 : 0xFF8800)
        .addFields(
          { name: 'Winner', value: userWins ? user.username : opponent.username, inline: false },
          { name: `${user.username}'s Realm`, value: user.realm, inline: true },
          { name: `${opponent.username}'s Realm`, value: opponentUser.realm, inline: true }
        )
        .setTimestamp();
      
      if (userWins) {
        await storage.updateUser(user.id, { 
          xp: user.xp + 50,
          voidCrystals: user.voidCrystals + 10,
          karma: user.karma + 5
        });
      }
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({ content: 'Error during spar.', ephemeral: true });
    }
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
    try {
      const user = await storage.getUserByDiscordId(interaction.user.id);
      if (!user) {
        await interaction.reply({ content: 'You are not registered.', ephemeral: true });
        return;
      }
      
      const name = interaction.options.getString('name');
      
      const faction = await storage.createFaction({
        name,
        description: null,
        leaderId: user.id,
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
          { name: 'Your Rank', value: 'Leader', inline: true }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({ content: 'Error creating faction.', ephemeral: true });
    }
  }
  
  private async handleJoinFaction(interaction: any) {
    try {
      const user = await storage.getUserByDiscordId(interaction.user.id);
      if (!user) {
        await interaction.reply({ content: 'You are not registered.', ephemeral: true });
        return;
      }
      
      const factionId = interaction.options.getInteger('faction_id');
      const faction = await storage.getFactionById(factionId);
      
      if (!faction) {
        await interaction.reply({ content: `Faction not found.`, ephemeral: true });
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
    } catch (error) {
      await interaction.reply({ content: 'Error joining faction.', ephemeral: true });
    }
  }
  
  private async handleLeaveFaction(interaction: any) {
    try {
      const user = await storage.getUserByDiscordId(interaction.user.id);
      if (!user) {
        await interaction.reply({ content: 'You are not registered.', ephemeral: true });
        return;
      }
      
      if (!user.factionId) {
        await interaction.reply({ content: 'You are not in a faction.', ephemeral: true });
        return;
      }
      
      const faction = await storage.getFactionById(user.factionId);
      await storage.updateUser(user.id, { factionId: null, factionRank: null });
      
      const embed = new EmbedBuilder()
        .setTitle('🏛️ Faction Left')
        .setDescription(`You have left ${faction?.name || 'the faction'}.`)
        .setColor(0xFF4444)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({ content: 'Error leaving faction.', ephemeral: true });
    }
  }
  
  private async handleFactionInfo(interaction: any) {
    try {
      const user = await storage.getUserByDiscordId(interaction.user.id);
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
          { name: 'War Points', value: (faction.warPoints || 0).toString(), inline: true },
          { name: 'Your Rank', value: user.factionRank || 'Member', inline: true }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({ content: 'Error fetching faction info.', ephemeral: true });
    }
  }
  
  private async handleShopCommand(interaction: any) {
    try {
      const items = await storage.getItems();
      
      const embed = new EmbedBuilder()
        .setTitle('🏪 Cultivation Shop')
        .setDescription('Purchase items with Void Crystals')
        .setColor(0x00D4FF);
      
      if (items.length === 0) {
        embed.setDescription('Shop is empty!');
      } else {
        items.slice(0, 10).forEach(item => {
          embed.addFields({
            name: `${item.name} (ID: ${item.id}) - ${item.rarity}`,
            value: `${item.description || 'No description'}\n💎 Price: ${item.price}`,
            inline: false
          });
        });
      }
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({ content: 'Error fetching shop.', ephemeral: true });
    }
  }
  
  private async handleBuyCommand(interaction: any) {
    try {
      const user = await storage.getUserByDiscordId(interaction.user.id);
      if (!user) {
        await interaction.reply({ content: 'You are not registered.', ephemeral: true });
        return;
      }
      
      const itemId = interaction.options.getInteger('item_id');
      const quantity = interaction.options.getInteger('quantity') || 1;
      
      const item = await storage.getItem(itemId);
      if (!item) {
        await interaction.reply({ content: 'Item not found.', ephemeral: true });
        return;
      }
      
      const totalCost = item.price * quantity;
      if (user.voidCrystals < totalCost) {
        await interaction.reply({ content: 'Not enough void crystals!', ephemeral: true });
        return;
      }
      
      await storage.updateUser(user.id, { voidCrystals: user.voidCrystals - totalCost });
      await storage.addUserItem(user.id, itemId, quantity);
      
      const embed = new EmbedBuilder()
        .setTitle('✅ Purchase Successful')
        .setDescription(`You purchased ${quantity}x ${item.name}`)
        .setColor(0x00FF88)
        .addFields(
          { name: 'Cost', value: `-${totalCost} void crystals`, inline: true },
          { name: 'Remaining', value: `${user.voidCrystals - totalCost} void crystals`, inline: true }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({ content: 'Error purchasing item.', ephemeral: true });
    }
  }
  
  private async handleInventoryCommand(interaction: any) {
    try {
      const user = await storage.getUserByDiscordId(interaction.user.id);
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
        items.forEach((userItem: any) => {
          embed.addFields({
            name: `${userItem.item.name} ${userItem.isEquipped ? '(Equipped)' : ''}`,
            value: `${userItem.item.description || 'No description'}\nQuantity: ${userItem.quantity}`,
            inline: true
          });
        });
      }
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({ content: 'Error fetching inventory.', ephemeral: true });
    }
  }
  
  private async handleEquipCommand(interaction: any) {
    try {
      const user = await storage.getUserByDiscordId(interaction.user.id);
      if (!user) {
        await interaction.reply({ content: 'You are not registered.', ephemeral: true });
        return;
      }
      
      const itemId = interaction.options.getInteger('item_id');
      await storage.equipItem(user.id, itemId);
      
      const embed = new EmbedBuilder()
        .setTitle('✅ Item Equipped')
        .setColor(0x00FF88)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({ content: 'Error equipping item.', ephemeral: true });
    }
  }
  
  private async handleMissionsCommand(interaction: any) {
    try {
      const user = await storage.getUserByDiscordId(interaction.user.id);
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
            value: `${mission.description || 'No description'}\n⭐ XP: ${mission.xpReward} | 💎 Reward: ${mission.crystalReward}`,
            inline: false
          });
        });
      }
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({ content: 'Error fetching missions.', ephemeral: true });
    }
  }
  
  private async handleCompleteMissionCommand(interaction: any) {
    try {
      const user = await storage.getUserByDiscordId(interaction.user.id);
      if (!user) {
        await interaction.reply({ content: 'You are not registered.', ephemeral: true });
        return;
      }
      
      const missionId = interaction.options.getInteger('mission_id');
      await storage.completeMission(user.id, missionId);
      
      const embed = new EmbedBuilder()
        .setTitle('✅ Mission Completed!')
        .setColor(0x00FF88)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({ content: 'Error completing mission.', ephemeral: true });
    }
  }
  
  private async handleLeaderboardCommand(interaction: any) {
    try {
      const sortBy = interaction.options.getString('sort_by') || 'realm';
      const leaderboard = await storage.getLeaderboard(interaction.guild.id, 10);
      
      const embed = new EmbedBuilder()
        .setTitle('🏆 Cultivation Leaderboard')
        .setColor(0xFFD700)
        .setDescription(`Top 10 Cultivators by ${sortBy}`);
      
      if (leaderboard.length === 0) {
        embed.setDescription('No cultivators yet!');
      } else {
        leaderboard.forEach((user: any, index: number) => {
          embed.addFields({
            name: `${index + 1}. ${user.username}`,
            value: `${user.realm} - Level ${user.level}\n💎 Crystals: ${user.voidCrystals}`,
            inline: false
          });
        });
      }
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({ content: 'Error fetching leaderboard.', ephemeral: true });
    }
  }
  
  private async handleRebirthCommand(interaction: any) {
    try {
      const user = await storage.getUserByDiscordId(interaction.user.id);
      if (!user) {
        await interaction.reply({ content: 'You are not registered.', ephemeral: true });
        return;
      }
      
      const currentRealmIndex = cultivationRealms.indexOf(user.realm as any);
      if (currentRealmIndex < 10) {
        await interaction.reply({ content: 'You must reach at least the Dao Realm to rebirth!', ephemeral: true });
        return;
      }
      
      const bonus = Math.floor(user.voidCrystals * 0.1);
      
      await storage.updateUser(user.id, {
        level: 1,
        xp: 0,
        realm: 'Connate Realm',
        voidCrystals: Math.floor(user.voidCrystals * 1.5),
        rebirthCount: user.rebirthCount + 1,
      });
      
      const embed = new EmbedBuilder()
        .setTitle('🔄 Rebirth Complete!')
        .setDescription('You have been reborn with enhanced power!')
        .setColor(0xFF00FF)
        .addFields(
          { name: 'Bonus Crystals', value: `+${bonus}`, inline: true },
          { name: 'Rebirth Count', value: (user.rebirthCount + 1).toString(), inline: true },
          { name: 'Starting Realm', value: 'Connate Realm', inline: true }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({ content: 'Error during rebirth.', ephemeral: true });
    }
  }
  
  private async handleStatsCommand(interaction: any) {
    try {
      const user = await storage.getUserByDiscordId(interaction.user.id);
      if (!user) {
        await interaction.reply({ content: 'You are not registered.', ephemeral: true });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle(`📊 ${user.username}'s Detailed Stats`)
        .setColor(0x00D4FF)
        .addFields(
          { name: '🏔️ Current Realm', value: user.realm, inline: false },
          { name: '📈 Level', value: user.level.toString(), inline: true },
          { name: '⭐ Rank', value: user.rank, inline: true },
          { name: 'XP', value: `${user.xp} / ${100 * user.level}`, inline: true },
          { name: '💎 Void Crystals', value: user.voidCrystals.toString(), inline: true },
          { name: '✨ Spirit Points', value: user.spiritPoints.toString(), inline: true },
          { name: '🌙 Karma', value: user.karma.toString(), inline: true },
          { name: '🎯 Fate', value: user.fate.toString(), inline: true },
          { name: '🔄 Rebirths', value: user.rebirthCount.toString(), inline: true },
          { name: '👤 Premium', value: user.isPremium ? 'Yes' : 'No', inline: true }
        )
        .setThumbnail(user.avatar || interaction.user.displayAvatarURL())
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({ content: 'Error fetching stats.', ephemeral: true });
    }
  }
  
  private async handleBloodlineCommand(interaction: any) {
    try {
      const user = await storage.getUserByDiscordId(interaction.user.id);
      if (!user) {
        await interaction.reply({ content: 'You are not registered.', ephemeral: true });
        return;
      }
      
      let bloodlineInfo = 'No bloodline';
      if (user.bloodlineId) {
        const bloodline = await storage.getBloodline(user.bloodlineId);
        bloodlineInfo = bloodline?.name || 'Unknown Bloodline';
      }
      
      const embed = new EmbedBuilder()
        .setTitle(`🧬 ${user.username}'s Bloodline`)
        .setColor(0xFF00FF)
        .setDescription(bloodlineInfo)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({ content: 'Error fetching bloodline.', ephemeral: true });
    }
  }
  
  private async handleTradeCommand(interaction: any) {
    try {
      const embed = new EmbedBuilder()
        .setTitle('🔄 Trade Initiated')
        .setDescription('Trading system coming soon!')
        .setColor(0x00D4FF)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({ content: 'Error initiating trade.', ephemeral: true });
    }
  }
  
  private async handleSectMasterCommand(interaction: any) {
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
    try {
      const targetUser = interaction.options.getUser('user');
      const levels = interaction.options.getInteger('levels');
      
      const user = await storage.getUserByDiscordId(targetUser.id);
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
        .setDescription(`The Sect Master has granted ${levels} levels to ${targetUser.username}!`)
        .setColor(0x00FF88)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({ content: 'Error granting levels.', ephemeral: true });
    }
  }
  
  private async handleBanishCommand(interaction: any) {
    try {
      const targetUser = interaction.options.getUser('user');
      const user = await storage.getUserByDiscordId(targetUser.id);
      
      if (!user) {
        await interaction.reply({ content: 'User not found.', ephemeral: true });
        return;
      }
      
      await storage.updateUser(user.id, {
        realm: 'Connate Realm',
        level: 1,
        xp: 0,
        voidCrystals: 0,
      });
      
      const embed = new EmbedBuilder()
        .setTitle('⚡ Divine Punishment!')
        .setDescription(`The Sect Master has banished ${targetUser.username} back to the Connate Realm!`)
        .setColor(0xFF4444)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({ content: 'Error banishing user.', ephemeral: true });
    }
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
