# Void Paragon Bot - Void Cultivation Discord Bot

## Overview
Void Paragon Bot is a comprehensive Discord cultivation RPG bot with web dashboard featuring 25 cultivation realms, hierarchical rank system, strict time-based scheduling, database persistence, combat system, factions/clans, multiple currencies (Void Crystals, Sect Points, Karma, Fate), missions, events, and moderation. The bot provides real-time bidirectional synchronization between Discord bot and dashboard - all actions reflect instantly on both platforms via WebSocket.

**Deployed**: Render (paid tier, $12/month) at https://void-paragon-bot.onrender.com with Discord OAuth authentication

## User Preferences
- Preferred communication style: Simple, everyday language
- Prefers when agent handles git pushes instead of manual effort
- User exhausted with repetitive operational tasks
- **CRITICAL**: EVERYTHING done on Discord bot OR dashboard must reflect instantly on the other

## System Architecture

### UI/UX Decisions
- **Dashboard Layout**: 8-tier hierarchical role-based permission system with cultivation-themed design
- **Components**: Built with Radix UI, styled using Tailwind CSS and shadcn/ui
- **Features**: Displayed based on user rank, showing locked/restricted rather than hidden
- **Multi-page Structure**: 
  - Profile (cultivation stats, realm progression)
  - Spar (PvP battles)
  - Inventory (read-only items with rank-based limits)
  - Shop (purchase items with auto-generation: VC Shop, SP Shop, Karma Shop)
  - Missions (daily, weekly, monthly, special)
  - Events (Void Sect Defense, mini-events)
  - Factions & Clans (organization system)
  - Premium (subscription features)
  - Admin (Sect Control panel)

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Vite, TanStack Query for state management, Wouter for routing, WebSocket for real-time updates
- **Backend**: Node.js with Express.js, TypeScript, and Discord.js v14
- **Database**: PostgreSQL with Drizzle ORM and Neon serverless provider
- **Real-time Communication**: WebSocket server for live data synchronization across bot and dashboard
- **AI Integration**: OpenAI GPT-5 (optional fallback if no API key)

### Feature Specifications

#### Cultivation System
- **25 Realms**: Connate, Yin, Yang, Spirit, Imperial (9 levels each), Heavenly Spirit (9 levels), then most others have 3 levels (early/mid/peak), True God Realm (end point)
- **XP-based Progression**: With strict time-based scheduling
- **Stats**: Power, Defense, Agility, Wisdom
- **Supreme Sect Master Exclusion**: Discord ID 1344237246240391272 excluded from XP earning and automatic progression

#### Hierarchical Role-Based Dashboard (8 Ranks)
1. Outer Disciple (Inventory: 3 items)
2. Inner Disciple (Inventory: 5 items)
3. Core Disciple (Inventory: 7 items)
4. Inheritor Disciple (Inventory: 10 items)
5. Guardians - Minor Moderators (Inventory: 15 items)
6. Elder (Inventory: 20 items)
7. Great Elder (Inventory: 30 items)
8. Heavenly Elder (Inventory: 50 items)
9. Supreme Sect Master (Inventory: No limit)

#### Inventory & Shop System
- **Inventory**: Read-only display of owned items with rank-based limits
  - Tabs: Weapons, Pills, Rare Treasures, Bloodlines, Skills
  - Capacity check: Shows current items / inventory limit
  - Cannot exceed inventory limit based on rank
  
- **Shop**: Three auto-regenerating currency shops
  - **VC Shop**: Most common treasures (weapons, pills, treasures) - Auto-regenerates every few hours
  - **SP Shop**: Rare objects, weapons, bloodlines - Auto-regenerates daily or every several hours
  - **Karma Shop**: Legendary god-tier objects - Auto-regenerates randomly (2x daily to 1x every 3 days)

#### Economy & Currencies
- **Void Crystals (VC)**: Common currency for basic purchases
- **Sect Points (SP)**: Earned through activities, used for rare items
- **Karma**: Legendary currency, slowly accumulated, used for god-tier items
- **Fate**: Special currency (implementation pending)

#### Real-Time Synchronization (WebSocket)
- **CRITICAL REQUIREMENT**: All actions must reflect instantly
  - Announcements via Discord bot or dashboard → spread to announcement channel + all dashboards
  - Purchases via Discord bot or dashboard → instant inventory update everywhere
  - Events → visible on mini-events channel + dashboard events page
  - Status changes → real-time across all clients
  - Broadcasts include: itemPurchased, missionCompleted, eventTriggered, announcementMade, etc.

#### Discord Bot Integration
- **21 Slash Commands**: Full Discord command structure
- **Event Handling**: XP gain, notifications, role-based access control, auto-responses
- **Role-based Access Control**: 8-tier permission system
- **Moderation System**: 3-strike system (warning → temp ban → expulsion)
- **Activity Tracking**: Daily reports (total members, disciple count, elder count, top users)

#### Mission System
- **Daily, Weekly, Monthly, Special Missions**
- **Progress Tracking**: Visual progress bars
- **Rewards**: Currency and XP based on rank and difficulty

#### Event System
- **Void Sect Defense**: Server-wide alien invasion events with participation requirements
- **Mini-Events**: Channel-specific events with rewards
- **Real-time Reflection**: Events appear on both Discord and dashboard

#### Other Systems
- **Battle System**: PvP combat, faction wars, real-time battle updates
- **Inventory System**: Weapons, armor, consumables with rarity tiers
- **Faction System**: Creation, management, member roles
- **Clan System**: Similar to factions with token-based mechanics
- **Bloodline System**: Special abilities and stat modifiers

### Database Schema
- Users (cultivation stats, rank, realm, XP, currencies)
- Items (weapons, pills, treasures, bloodlines, skills)
- Inventory (user items with quantities and limits)
- Missions (daily, weekly, monthly, special)
- UserMissions (progress tracking)
- Battles (PvP history)
- Factions (organization data)
- Clans (organization data)
- ServerSettings (per-guild configuration)
- ShopItems (auto-generated shop inventory)
- ActivityLog (user actions for real-time sync)

## External Dependencies

### Discord Integration
- **Discord.js v14**: Core library for Discord bot functionality

### AI Integration
- **OpenAI GPT-5**: For AI conversations and intelligent game generation (optional)

### Database Services
- **Neon**: Serverless PostgreSQL database provider

### UI/UX Libraries
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **TanStack Query v5**: Server state management

### Development Tools
- **Vite**: Build tool for frontend
- **TypeScript**: Type safety
- **Drizzle Kit**: Database schema management
- **Discord.js**: Bot functionality

## Recent Changes (Current Session)
- Separated Inventory (read-only) from Shop (purchase with auto-generation)
- Implemented three currency-based shops: VC, SP, Karma with different regeneration rates
- Added inventory limits based on rank (3-unlimited items)
- Created Shop page with buy functionality
- Updated dashboard navigation to include Shop route
- Added API endpoints: `/api/shop/vc`, `/api/shop/sp`, `/api/shop/karma`, `/api/shop/buy`
- Prepared WebSocket broadcasting infrastructure for real-time sync

## Next Steps (Critical)
1. Implement WebSocket broadcasting for all actions (purchases, missions, events, announcements)
2. Add auto-generation logic for shop items with timers
3. Implement inventory limits enforcement during purchases
4. Connect Discord bot commands to trigger dashboard updates
5. Full real-time sync testing between bot and dashboard
6. Implement remaining pages functionality (Missions, Events, Factions, Clans)
7. Add admin controls for moderation and server management
8. Implement battle system with real-time combat updates

## Known Issues
- None currently blocking functionality

## Testing Notes
- Dashboard loads successfully with multi-page sidebar navigation
- Authentication via Discord OAuth working
- API endpoints responding correctly
- WebSocket connection ready for broadcasting
