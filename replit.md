# Void Paragon Bot - Void Cultivation Discord Bot

## Overview
Void Paragon Bot is a comprehensive Discord cultivation RPG bot with web dashboard featuring 25 cultivation realms, hierarchical rank system (9 tiers), combat system, factions/clans management, multiple currencies (Void Crystals, Sect Points, Karma, Fate), auto-generating missions and events, and moderation tools. Deployed on Render at https://void-paragon-bot.onrender.com with Discord OAuth. 

**CRITICAL REQUIREMENT**: Real-time bidirectional synchronization between Discord bot and dashboard with ZERO delays using EventBus architecture.

## User Preferences
- Preferred communication style: Simple, everyday language
- Prefers when agent handles git pushes instead of manual effort
- User exhausted with repetitive operational tasks
- **CRITICAL**: Build for LONG TERM use - prioritize architecture and robustness over speed
- **CRITICAL**: EVERYTHING done on Discord bot OR dashboard must reflect instantly on the other
- **CRITICAL**: NO broken buttons - every UI element must work perfectly

## System Architecture

### Real-Time Sync Architecture (EventBus Pattern)
- **EventBus (server/event-bus.ts)**: Singleton EventEmitter for coordinating all real-time updates
- **WebSocket Server**: Connected at `/ws` path with client registration per server
- **Bidirectional Flow**:
  - Discord Command → EventBus → WebSocket Broadcast → Dashboard (instant update)
  - Dashboard Action → EventBus → Discord Announcement (instant feedback)
  - All events include timestamp for ordering, serverId for targeting, type for routing

### UI/UX Decisions
- **Dashboard Layout**: 8-tier hierarchical role-based permission system with cultivation-themed design
- **Components**: Built with Radix UI, styled using Tailwind CSS and shadcn/ui
- **Features**: Displayed based on user rank, showing locked/restricted rather than hidden
- **Multi-page Structure**: Profile, Spar, Inventory, Shop, Missions, Events, Factions, Clans, Premium, Admin
- **Real-time Indicators**: All pages show "syncing" status and last update timestamp

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Vite, TanStack Query v5, Wouter routing, WebSocket real-time
- **Backend**: Node.js with Express.js, TypeScript, Discord.js v14
- **Database**: PostgreSQL with Drizzle ORM and Neon serverless provider
- **Real-time Communication**: WebSocket server with EventBus for coordinated messaging
- **AI Integration**: OpenAI GPT-5 (optional, disabled if no API key)

### Feature Specifications

#### Cultivation System
- **25 Realms**: Connate, Yin, Yang, Spirit, Imperial (9 levels each), Heavenly Spirit (9 levels), then most others (3 levels each), True God Realm
- **XP-based Progression**: With strict time-based scheduling
- **Stats**: Power, Defense, Agility, Wisdom
- **Supreme Sect Master Exclusion**: Discord ID 1344237246240391272 excluded from XP earning and automatic progression

#### Hierarchical Role-Based Dashboard (8 Ranks + Admin)
1. Outer Disciple (Inventory: 3 items)
2. Inner Disciple (Inventory: 5 items)
3. Core Disciple (Inventory: 7 items)
4. Inheritor Disciple (Inventory: 10 items) - Can create Factions
5. Guardians - Minor Moderators (Inventory: 15 items)
6. Elder (Inventory: 20 items)
7. Great Elder (Inventory: 30 items) - Can create Clans
8. Heavenly Elder (Inventory: 50 items) - Can create Clans
9. Supreme Sect Master (Inventory: No limit) - Full admin

#### Factions System (For Inheritor Disciples+)
- Full CRUD management
- Member tracking with roles (Leader, Member)
- Faction XP and Void Crystals pooling
- Faction rankings and prestige
- Auto-sync: Changes on dashboard instantly appear in Discord announcements

#### Clans System (For Great/Heavenly Elders+)
- Full management with chief and elders
- Clan-exclusive special skills and weapons
- Unique clan bloodlines (costs SP + Karma to acquire)
- Clan treasuries and war points
- Auto-sync: Clan activities instantly broadcast to server channels

#### Missions System
- Daily (3 simple missions auto-generated)
- Weekly (harder missions)
- Monthly (extremely challenging)
- Auto-generation daily at consistent times (STRICT TIME-BASED)
- Progress tracking with visual bars
- Instant reward delivery and XP/currency updates
- Dashboard <-> Discord command sync

#### Events System
- Daily, weekly, monthly, yearly events
- Interactive questions with player choices
- Participant tracking and placement
- Reward distribution by placement
- Server-wide visibility and Discord channel announcements

#### Shop System
- Three auto-regenerating currency shops (VC, SP, Karma)
- Timer display showing next regeneration
- Auto-generation every 2-3 hours
- Purchase history and transaction logs
- Inventory limit enforcement by rank

#### Battle System
- PvP combat with weapon/skill/bloodline calculations
- Stats: Power, Defense, Agility, Wisdom
- Rare consumable pills for one-time boosts
- Battle history tracking
- Discord announcements for epic battles

#### Real-Time Sync Requirements (EventBus)
- **Discord → Dashboard**: User gains XP in bot → dashboard shows immediately via WebSocket
- **Dashboard → Discord**: User buys item on dashboard → Discord bot announces in server immediately
- **Bidirectional**: Missions completed in Discord appear on dashboard, faction changes sync both ways
- **Zero Delay**: No polling, pure event-driven with EventEmitter

### Database Schema (PostgreSQL)
- **Users**: cultivation stats, rank, realm, XP, currencies, equipped items
- **Factions**: organization data, XP, treasury, rankings
- **Clans**: organization data with special items, treasury, prestige
- **Missions**: daily/weekly/monthly with auto-generation metadata
- **Events**: with questions/choices, participant tracking
- **Items**: weapons, pills, treasures, bloodlines, skills with rarity tiers
- **UserItems**: inventory with quantity tracking and rank-based limits
- **Battles**: PvP history with stats and outcomes
- **ShopItems**: auto-generated inventory per currency type with timers
- **SchedulerEvents**: tracks last run time for strict time-based generation

## External Dependencies

### Discord Integration
- **Discord.js v14**: Core bot library with slash commands

### AI Integration
- **OpenAI GPT-5**: For AI conversations (optional, graceful fallback)

### Database Services
- **Neon**: Serverless PostgreSQL database

### UI/UX Libraries
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library (600+ icons)
- **TanStack Query v5**: Server state management

### Development Tools
- **Vite**: Frontend build tool
- **TypeScript**: Type safety across full stack
- **Drizzle Kit**: Database schema management
- **Express.js**: HTTP server framework

## Recent Changes (Current Session - MAJOR REFACTOR)
- Created EventBus (server/event-bus.ts) as singleton for coordinated real-time sync
- Extended schema with event questions/choices, clan special items, mission metadata
- Built Events page with interactive questions and join buttons
- Built Missions page with progress tracking and instant completion rewards
- Built Factions page with creation and member tracking
- Built Clans page with establishment and hierarchy management
- Added 6 new API endpoints (events, missions, factions, clans)
- Fixed Vite HMR configuration and import errors
- Implemented mission auto-generation system (runs every 24 hours)

## Architecture Patterns (For Long-Term Maintenance)

### 1. Real-Time Sync Pattern (EventBus)
Every state change goes through EventBus:
```
Action (Discord or Dashboard) 
  → Modify Database 
  → Emit EventBus event 
  → Broadcast to WebSocket clients 
  → Update Dashboard UI
  → Post Discord announcement
```

### 2. Storage Interface Pattern
All database operations go through `IStorage` interface in `server/storage.ts`:
- Single source of truth for CRUD operations
- Easy to test and mock
- Easy to migrate to different database

### 3. Type-Safe End-to-End
- Shared schema defined once in `shared/schema.ts`
- Drizzle ORM generates types automatically
- Frontend uses extracted types from schema
- No manual type duplication

### 4. Mission Auto-Generation (Time-Based)
- Dedicated `missionService` handles generation logic
- Uses scheduler to track last run time
- Generates missions at consistent times (daily at same hour)
- Tracks generation history in database

### 5. Discord Command Handling
- All commands go through `handleSlashCommand()` in discord-bot.ts
- After each command, emit EventBus event for sync
- Discord command results broadcast to dashboard immediately

## Next Steps (HIGH PRIORITY)
1. ✅ Create EventBus singleton for coordinated sync
2. Complete EventBus integration in routes.ts (use eventBus for all broadcasts)
3. Complete EventBus integration in discord-bot.ts (emit events after commands)
4. Test bidirectional sync: Discord → Dashboard and Dashboard → Discord
5. Add sync status indicators to frontend (connecting/synced/error states)
6. Implement proper error handling and reconnection logic
7. Add comprehensive logging for debugging real-time issues
8. Performance testing under concurrent user load

## Known Issues
- None currently blocking functionality (all pages load and work)

## Testing Notes
- Dashboard loads successfully
- All pages render correctly (Events, Missions, Factions, Clans, Spar, Shop, etc.)
- WebSocket connection now working (Vite HMR fixed)
- API endpoints responding

## For Future Developers
- Keep EventBus as the single source of truth for state changes
- Always emit events after database modifications
- Never bypass the storage interface
- Test bidirectional sync with fresh WebSocket connections
- Monitor event emission performance under heavy load
