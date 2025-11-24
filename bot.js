import { Client, Collection, GatewayIntentBits, REST, Routes, ChannelType } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ] 
});

client.commands = new Collection();

const commands = [
  {
    name: 'ping',
    description: 'Responds with Pong!',
    execute: async (interaction) => {
      await interaction.reply(`Pong! ${client.ws.ping}ms`);
    }
  },
  {
    name: 'hello',
    description: 'Says hello to you',
    execute: async (interaction) => {
      await interaction.reply(`Hello ${interaction.user}!`);
    }
  },
  {
    name: 'info',
    description: 'Shows bot info',
    execute: async (interaction) => {
      await interaction.reply({
        content: `Bot is running!\nUptime: ${Math.floor(client.uptime / 1000)}s\nLatency: ${client.ws.ping}ms`
      });
    }
  }
];

commands.forEach(cmd => {
  client.commands.set(cmd.name, cmd);
});

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`Registering ${commands.length} commands...`);
  
  try {
    const data = await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log(`✅ Registered ${data.length} command(s)`);
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    console.warn(`⚠️ Unknown command: ${interaction.commandName}`);
    return;
  }

  try {
    console.log(`▶️  Executing command: ${interaction.commandName} (${interaction.user.tag})`);
    await command.execute(interaction);
  } catch (error) {
    console.error(`❌ Error executing command ${interaction.commandName}:`, error);
    await interaction.reply({ 
      content: 'There was an error executing this command!',
      ephemeral: true 
    }).catch(e => console.error('Failed to send error message:', e));
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  if (message.content.toLowerCase().startsWith('hello bot')) {
    console.log(`▶️  Message from ${message.author.tag}: "${message.content}"`);
    await message.reply(`👋 Hi ${message.author}!`);
  }
});

client.on('error', error => console.error('❌ Client error:', error));
process.on('unhandledRejection', error => console.error('❌ Unhandled rejection:', error));

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ DISCORD_TOKEN not found in environment variables!');
  process.exit(1);
}

console.log('🤖 Starting Discord bot...');
console.log('🔑 Token:', token.substring(0, 10) + '...');
client.login(token).catch(error => {
  console.error('❌ Failed to login:', error.message);
  process.exit(1);
});
