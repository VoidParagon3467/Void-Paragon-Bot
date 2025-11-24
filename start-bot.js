import('./server/discord-bot.ts').then(({ bot }) => {
  console.log('Starting bot...');
  bot.start().catch(err => console.error('Bot start failed:', err));
});
