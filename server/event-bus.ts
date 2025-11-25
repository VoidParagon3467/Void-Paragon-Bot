import { EventEmitter } from "events";

/**
 * Central Event Bus for coordinating real-time sync between Discord bot and dashboard
 * Ensures ZERO-delay bidirectional updates
 * 
 * Events flow:
 * Discord Command -> Event Bus -> WebSocket Broadcast -> Dashboard
 * Dashboard Action -> Event Bus -> Discord Announcement/Bot Action
 */

interface BroadcastEvent {
  type: string;
  serverId: string;
  timestamp: Date;
  [key: string]: any;
}

interface DiscordEvent {
  type: string;
  userId: string;
  guildId: string;
  timestamp: Date;
  [key: string]: any;
}

export class EventBus extends EventEmitter {
  private static instance: EventBus;
  private wsClients: Map<string, Set<any>> = new Map(); // serverId -> Set of WebSocket clients

  private constructor() {
    super();
    this.setMaxListeners(100);
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Register a WebSocket client to a server
   * Allows targeted broadcasts to specific servers
   */
  registerWsClient(serverId: string, client: any): void {
    if (!this.wsClients.has(serverId)) {
      this.wsClients.set(serverId, new Set());
    }
    this.wsClients.get(serverId)!.add(client);
  }

  /**
   * Unregister a WebSocket client
   */
  unregisterWsClient(serverId: string, client: any): void {
    const clients = this.wsClients.get(serverId);
    if (clients) {
      clients.delete(client);
      if (clients.size === 0) {
        this.wsClients.delete(serverId);
      }
    }
  }

  /**
   * Broadcast an event to all connected WebSocket clients for a server
   * This is called when:
   * - Discord command completes
   * - Dashboard action completes
   * - Server-wide announcements happen
   */
  broadcastToServer(event: BroadcastEvent): void {
    const clients = this.wsClients.get(event.serverId);
    if (clients && clients.size > 0) {
      clients.forEach((client: any) => {
        if (client.readyState === 1) { // WebSocket OPEN
          client.send(JSON.stringify(event));
        }
      });
    }

    // Also emit as internal event for Discord bot to listen
    this.emit(`broadcast:${event.serverId}`, event);
  }

  /**
   * Discord bot emits when a command is executed
   * This immediately broadcasts to all dashboard clients
   */
  emitDiscordCommand(event: DiscordEvent): void {
    const { type, guildId, timestamp, ...rest } = event;
    this.broadcastToServer({
      type: `discord:${type}`,
      serverId: guildId,
      timestamp: timestamp,
      ...rest,
    });
  }

  /**
   * Dashboard emits when an action completes (purchase, mission, etc.)
   * This allows Discord bot to announce in server
   */
  emitDashboardAction(event: BroadcastEvent): void {
    // Broadcast to all dashboard clients immediately
    this.broadcastToServer(event);
    
    // Discord bot can listen on this
    const { type, ...rest } = event;
    this.emit(`action:${type}`, { ...rest, type });
  }

  /**
   * Listen for discord command results to broadcast
   */
  onDiscordCommand(type: string, callback: (event: DiscordEvent) => void): void {
    this.on(`discord:${type}`, callback);
  }

  /**
   * Listen for dashboard action results to announce in Discord
   */
  onDashboardAction(type: string, callback: (event: BroadcastEvent) => void): void {
    this.on(`action:${type}`, callback);
  }

  /**
   * Get all WebSocket clients for a server (for admin/debug)
   */
  getServerClients(serverId: string): number {
    return this.wsClients.get(serverId)?.size ?? 0;
  }

  /**
   * Get total connected clients across all servers
   */
  getTotalClients(): number {
    let total = 0;
    this.wsClients.forEach(clients => total += clients.size);
    return total;
  }
}

export const eventBus = EventBus.getInstance();
