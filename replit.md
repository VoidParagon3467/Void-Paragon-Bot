# Void Cultivation Discord Bot

## Overview

This is a **half-AI Discord bot** for a cultivation/progression RPG system. The bot features AI-powered conversations (with OpenAI GPT-5), interactive games, comprehensive moderation, and automated systems. Users can progress through 25 cultivation realms, complete missions, battle other players, and chat with an intelligent AI companion through DM.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with custom cultivation-themed design system
- **UI Components**: Radix UI components with shadcn/ui design system
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Updates**: WebSocket integration for live data synchronization

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL
- **Session Management**: PostgreSQL session store
- **Real-time Communication**: WebSocket server for live updates
- **Discord Integration**: Discord.js v14 for bot functionality
- **AI Integration**: OpenAI GPT-5 for conversational abilities (optional)

### Database Design
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Comprehensive cultivation game schema with users, items, missions, battles, factions, bloodlines, strikes tracking, and activity logs
- **Migrations**: Database migrations managed through Drizzle Kit
- **Connection**: Neon serverless database with connection pooling

## Key Components

### ⭐ AI & Conversational System (NEW)
- **DM Chat**: Users can message the bot privately for intelligent Xianxia-themed conversations
- **Conversation Memory**: Bot maintains conversation history per user (last 20 messages)
- **Game Suggestions**: AI can suggest and facilitate games during chats
- **Model**: OpenAI GPT-5 (optional - degrades gracefully without API key)
- **Graceful Fallback**: Bot works with basic games if OpenAI key not provided

### 🎮 Interactive Games System (NEW)
- **Trivia**: AI-generated cultivation/Xianxia trivia questions (or pre-loaded if no AI)
- **Riddles**: Xianxia-themed riddle challenges with answers
- **Fortune Telling**: Mystical fortune predictions with cultivation advice
- **Number Guessing**: Classic 1-100 guessing game with feedback
- **Game Activation**: Games triggered in DMs via keywords or `/startgame` command
- **Active Tracking**: Bot prevents multiple simultaneous games per user

### Cultivation System
- **Progression**: 25 cultivation realms from Connate to True God
- **Experience System**: XP-based leveling with exponential growth requirements
- **Stats**: Power, Defense, Agility, and Wisdom attributes
- **Advancement**: Realm progression with level and resource requirements

### Discord Bot Integration
- **Commands**: 21 slash commands for profile, battles, missions, games, admin
- **Event Handling**: Message XP gain, member management, real-time notifications
- **Permissions**: Role-based access control with Sect Master privileges
- **Auto-responses**: Automated cultivation progression notifications

### 🛡️ Advanced Moderation System (NEW - 3-Strike System)
- **Strike 1**: Warning with violation details
- **Strike 2**: 24-hour temporary ban from bot
- **Strike 3**: Permanent expulsion from sect
- **Violation Types**: Advertising, spam, cheating, insults, explicit content
- **Elder Immunity**: Elders and moderators are immune from strikes
- **Admin Logging**: All strikes logged to bot logs channel

### 🌀 Void Sect Defense Event System (NEW)
- **Alien Invasions**: Server-wide events where aliens attack the sect
- **Max 3 Simultaneous**: Prevents server overload (max 3 events per server)
- **Defender Participation**: Disciples/Elders Spirit Realm+ must defend
- **Victory Rewards**: 1000 Void Crystals, 100 Sect Points, Custom Title
- **Defeat Penalties**: Lose Void Crystals, XP loss possible
- **Frequency**: Triggers every 6 hours with 30-second defense window

### 📊 Daily Activity Reporting System (NEW)
- **Daily Reports**: Logged to bot logs channel (visible to Sect Master only)
- **Metrics Tracked**: Total members, disciple count, elder count, top users
- **Frequency**: Every 24 hours at server startup
- **Purpose**: Monitor server activity and engagement trends

### 💬 Conversation Topic Generation (NEW)
- **Silent Channel Detection**: Monitors for inactive channels
- **Smart Generation**: Xianxia-themed conversation starters
- **Non-Spam**: Only triggers when 2+ user messages missing in last 10 messages
- **Topics**: 10 pre-loaded cultivation discussion topics
- **Purpose**: Keep community engaged and reduce awkward silence

### Mission System
- **Types**: Daily, weekly, monthly, and special missions
- **Progress Tracking**: Real-time mission progress with various completion criteria
- **Rewards**: XP, currency, and item rewards for mission completion
- **Auto-generation**: Dynamic mission creation based on player activity

### Battle System
- **PvP Combat**: Player vs player sparring and dueling
- **Faction Wars**: Large-scale faction-based battles
- **Battle Results**: Win/loss tracking with ranking implications
- **Real-time Updates**: Live battle notifications and leaderboard updates

### Item and Inventory System
- **Item Types**: Weapons, armor, consumables, treasures, and skills
- **Rarity System**: Common to Mythical rarity tiers
- **Equipment**: Item equipping and stat bonuses
- **Shop System**: Virtual currency-based item purchasing

## Data Flow

### User Authentication
1. Discord OAuth integration (to be implemented)
2. Session management via PostgreSQL store
3. User data synchronization between Discord and database
4. Permission validation for admin features

### Real-time Updates
1. WebSocket connection establishment on client connection
2. Server-side event broadcasting for user actions
3. Client-side query invalidation and UI updates
4. Discord bot notifications for significant events

### Cultivation Progression
1. Message-based XP gain through Discord activity
2. Real-time XP calculation and level progression
3. Realm advancement validation and resource deduction
4. Leaderboard and ranking updates

## External Dependencies

### Discord Integration
- **Discord.js v14**: Discord bot framework and API wrapper
- **Bot Token**: Required environment variable for Discord authentication
- **Permissions**: Guild message reading, slash commands, member management

### AI Integration (Optional)
- **OpenAI GPT-5**: For AI conversations and smart game generation
- **API Key**: OPENAI_API_KEY environment variable (optional)
- **Graceful Degradation**: Bot functions without AI key using pre-loaded content

### Database Services
- **Neon**: Serverless PostgreSQL database provider
- **Connection String**: DATABASE_URL environment variable required
- **SSL**: Secure connection to cloud database

### UI/UX Libraries
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography
- **TanStack Query**: Server state management and caching

### Development Tools
- **Vite**: Build tool with HMR and optimized bundling
- **TypeScript**: Type safety and enhanced developer experience
- **ESBuild**: Fast bundling for production builds
- **Drizzle Kit**: Database schema management and migrations

## Deployment Strategy

### Development Environment
- **Local Development**: tsx for TypeScript execution
- **Database**: Local or cloud PostgreSQL instance
- **Hot Reload**: Vite HMR for frontend, tsx watch for backend
- **Environment Variables**: .env file for local configuration

### Production Deployment
- **Build Process**: Vite build for frontend, ESBuild for backend
- **Static Assets**: Served from dist/public directory
- **Process Management**: Single Node.js process with Express serving both API and static files
- **Database Migrations**: Drizzle push for schema updates
- **Render.com Deployment**: Free tier with 30-60s cold starts

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (Neon)
- **DISCORD_BOT_TOKEN**: Discord bot authentication token
- **NODE_ENV**: Environment specification (development/production)
- **PORT**: Server port (5000 for frontend)
- **OPENAI_API_KEY**: OpenAI API key for AI features (optional)

## Changelog

```
Changelog:
- July 06, 2025. Initial setup
- November 24, 2025. 
  * Completed all core systems: cultivation progression, ranks, realms, battles, factions, clans
  * Implemented all 20 slash commands with full functionality
  * Added Hall of Fame leaderboards (separate Disciples/Elders, Sect Master excluded)
  * Implemented automatic systems: daily resources, item generation, hall of fame posting
  * Added Bot Logs channel (Sect Master-only, threaded by category)
  * Created Jadescrolls novel integration with /post_chapter command
  * Added Premium Rewards system with payment database tracking
  * Implemented WebSocket real-time updates
  * Fixed all LSP type errors (null checks, type extensions)
  * All systems tested and verified working
  * MAJOR UPDATE: Made bot half-AI with GPT-5 integration
    - Added DM conversational abilities with memory
    - Implemented 4 interactive games (trivia, riddle, fortune telling, number guessing)
    - Added Void Sect Defense event system (alien invasions, max 3 simultaneous)
    - Implemented 3-strike moderation system (warning → temp ban → expulsion)
    - Added daily activity reporting to bot logs
    - Implemented conversation topic generation for silent channels
    - Added userStrikes and dailyActivityLogs database tables
    - Bot gracefully degrades without OpenAI key (basic games available)
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
Prefers when agent handles git pushes instead of manual effort.
User exhausted with repetitive operational tasks.
```

## Features Summary

- **26 Cultivation Realms**: Progression from Connate to True God
- **25 Discord Commands**: Comprehensive gameplay and admin features
- **Real-time Systems**: WebSocket updates, auto-generation, daily rewards
- **Moderation**: 3-strike system with role-based immunity
- **Events**: Void Sect Defense with max 3 simultaneous, other random events
- **Leaderboards**: Hall of Fame (disciples/elders separated)
- **Novels**: Jadescrolls integration with chapter posting
- **Premium**: Tiered cosmetic items with pricing
- **AI Chat**: GPT-5 powered DM conversations (optional)
- **Games**: Trivia, riddles, fortune telling, number guessing
- **Database**: Full Drizzle ORM with Neon PostgreSQL
- **WebSockets**: Real-time data sync between client and server
