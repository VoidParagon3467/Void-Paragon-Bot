# Void Cultivation Discord Bot

## Overview
This project is a half-AI Discord bot designed for a cultivation/progression RPG system. It aims to provide an immersive experience with AI-powered conversations, interactive games, and a comprehensive progression system. Users can advance through 25 cultivation realms, engage in missions, battle other players, and interact with an intelligent AI companion. The bot features a sophisticated hierarchical role-based dashboard, a robust economy, and advanced moderation tools, all built to foster a dynamic and engaging community.

## User Preferences
Preferred communication style: Simple, everyday language.
Prefers when agent handles git pushes instead of manual effort.
User exhausted with repetitive operational tasks.

## System Architecture

### UI/UX Decisions
The dashboard features an 8-tier hierarchical role-based permission system with a cultivation-themed design. UI components are built with Radix UI and styled using Tailwind CSS and shadcn/ui. Features are displayed based on user rank, showing as locked/restricted rather than hidden, to indicate progression paths and premium content.

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Vite, TanStack Query for state management, Wouter for routing, and WebSocket for real-time updates.
- **Backend**: Node.js with Express.js, TypeScript, and Discord.js v14 for bot functionalities.
- **AI Integration**: OpenAI GPT-5 for conversational AI, with a graceful fallback if the API key is not provided.
- **Real-time Communication**: WebSocket server for live data synchronization across the bot and dashboard.

### Feature Specifications
- **Cultivation System**: 25 realms (Connate to True God), XP-based progression, stats (Power, Defense, Agility, Wisdom), and realm advancement mechanics.
- **Hierarchical Role-Based Dashboard**: 8 rank tiers (Outer Disciple to Supreme Sect Master), each with specific permissions for administration, event management, moderation, and resource access.
- **Organization System**: Factions and Clans with token-based creation and leaving mechanics.
- **AI & Conversational System**: DM chat with AI (GPT-5), conversation memory, game suggestions, and Xianxia-themed interactive games (Trivia, Riddles, Fortune Telling, Number Guessing).
- **Discord Bot Integration**: 21 slash commands, event handling (XP gain, notifications), role-based access control, and auto-responses.
- **Advanced Moderation**: 3-strike system (warning, temporary ban, permanent expulsion) with role-based immunity and admin logging.
- **Void Sect Defense Event System**: Server-wide alien invasion events with participation requirements, rewards, and penalties.
- **Daily Activity Reporting**: Tracks total members, disciple count, elder count, and top users.
- **Conversation Topic Generation**: Monitors inactive channels and suggests Xianxia-themed conversation starters.
- **Mission System**: Daily, weekly, monthly, and special missions with progress tracking and rewards.
- **Battle System**: PvP combat, faction wars, and real-time battle updates.
- **Item and Inventory System**: Various item types (weapons, armor, consumables) with rarity tiers, equipment mechanics, and a virtual shop.
- **Rank-Based Economy**: Tiered weapons, skills, and items with pricing and progression scaled by user rank. Auto-generation of various in-game resources (weapons, skills, treasures).

### System Design Choices
- **Database**: PostgreSQL with Drizzle ORM and Neon serverless provider. The schema includes users, items, missions, battles, factions, bloodlines, strikes, and activity logs.
- **Deployment**: Vite for frontend, ESBuild for backend, with a single Node.js process serving both API and static files in production.

## External Dependencies

### Discord Integration
- **Discord.js v14**: Core library for Discord bot functionality.

### AI Integration
- **OpenAI GPT-5**: Used for AI conversations and intelligent game generation (optional).

### Database Services
- **Neon**: Serverless PostgreSQL database provider.

### UI/UX Libraries
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **TanStack Query**: Server state management.

### Development Tools
- **Vite**: Build tool for frontend.
- **TypeScript**: For type safety across the project.
- **Drizzle Kit**: Database schema management and migrations.