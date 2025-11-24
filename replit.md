# Void Cultivation Discord Bot

## Overview

This is a full-stack Discord bot application for a cultivation/progression game system. The application consists of a React frontend dashboard, Express.js backend API, and Discord bot integration. Users can progress through cultivation realms, complete missions, battle other players, and manage their cultivation journey through both Discord commands and a web interface.

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

### Database Design
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Comprehensive cultivation game schema with users, items, missions, battles, factions, and bloodlines
- **Migrations**: Database migrations managed through Drizzle Kit
- **Connection**: Neon serverless database with connection pooling

## Key Components

### Cultivation System
- **Progression**: 26 cultivation realms from Connate to True God
- **Experience System**: XP-based leveling with exponential growth requirements
- **Stats**: Power, Defense, Agility, and Wisdom attributes
- **Advancement**: Realm progression with level and resource requirements

### Discord Bot Integration
- **Commands**: Slash commands for profile viewing, battles, missions, and administration
- **Event Handling**: Message XP gain, member management, and real-time notifications
- **Permissions**: Role-based access control with Sect Master privileges
- **Auto-responses**: Automated cultivation progression notifications

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
- **Discord.js**: Discord bot framework and API wrapper
- **Bot Token**: Required environment variable for Discord authentication
- **Permissions**: Guild message reading, slash commands, member management

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

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string
- **DISCORD_BOT_TOKEN**: Discord bot authentication token
- **NODE_ENV**: Environment specification (development/production)
- **PORT**: Server port configuration

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
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```