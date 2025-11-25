import { EventEmitter } from "events";

/**
 * Central Event Bus for coordinating real-time sync between Discord bot and dashboard
 * Singleton pattern ensures ZERO-delay bidirectional updates across entire application
 * 
 * Architecture for Long-Term Stability:
 * ✓ Centralized coordination point (single source of truth)
 * ✓ Type-safe event interfaces
 * ✓ Error handling with graceful degradation
 * ✓ Memory leak prevention with proper cleanup
 * ✓ Performance monitoring and logging
 * ✓ No polling - pure event-driven
 * 
 * Events flow:
 * Discord Command → EventBus → WebSocket Broadcast → Dashboard (INSTANT)
 * Dashboard Action → EventBus → Discord Bot (INSTANT)
 */

interface BroadcastEvent {
  type: string;
  serverId: string;
  timestamp: Date;
  userId?: number;
  [key: string]: any;
}

interface DiscordEvent {
  type: string;
  userId: string;
  guildId: string;
  timestamp: Date;
  [key: string]: any;
}

interface EventBusMetrics {
  totalEvents: number;
  totalBroadcasts: number;
  currentConnections: number;
  lastEventTime: Date | null;
}

export class EventBus extends EventEmitter {
  private static instance: EventBus;
  private wsClients: Map<string, Set<any>> = new Map(); // serverId -> Set of WebSocket clients
  private metrics: EventBusMetrics = {
    totalEvents: 0,
    totalBroadcasts: 0,
    currentConnections: 0,
    lastEventTime: null,
  };
  private failedBroadcasts: number = 0;
  private readonly MAX_LISTENERS = 200; // Increased for production load

  private constructor() {
    super();
    this.setMaxListeners(this.MAX_LISTENERS);
    this.setupMetricsLogging();
  }

  /**
   * Get or create EventBus singleton
   * Guaranteed to be the same instance across entire application
   */
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
      console.log("[EventBus] Initialized singleton instance");
    }
    return EventBus.instance;
  }

  /**
   * Setup periodic metrics logging for monitoring
   */
  private setupMetricsLogging(): void {
    setInterval(() => {
      if (this.metrics.totalEvents > 0) {
        console.log(
          `[EventBus Metrics] Events: ${this.metrics.totalEvents}, ` +
          `Broadcasts: ${this.metrics.totalBroadcasts}, ` +
          `Connections: ${this.metrics.currentConnections}, ` +
          `Failed: ${this.failedBroadcasts}`
        );
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Register a WebSocket client to a server
   * Allows targeted broadcasts to specific servers
   * Prevents memory leaks by tracking connections
   */
  registerWsClient(serverId: string, client: any): void {
    try {
      if (!serverId) {
        console.warn("[EventBus] Attempted to register client with empty serverId");
        return;
      }

      if (!this.wsClients.has(serverId)) {
        this.wsClients.set(serverId, new Set());
      }

      this.wsClients.get(serverId)!.add(client);
      this.metrics.currentConnections = this.getTotalClients();

      console.log(
        `[EventBus] Client registered to ${serverId}. ` +
        `Total connections: ${this.metrics.currentConnections}`
      );
    } catch (error) {
      console.error("[EventBus] Error registering client:", error);
    }
  }

  /**
   * Unregister a WebSocket client
   * CRITICAL: Must be called on both close AND error events
   * Prevents memory leaks from accumulating dead connections
   */
  unregisterWsClient(serverId: string, client: any): void {
    try {
      const clients = this.wsClients.get(serverId);
      if (clients) {
        clients.delete(client);

        // Cleanup empty server sets to prevent memory waste
        if (clients.size === 0) {
          this.wsClients.delete(serverId);
          console.log(`[EventBus] Removed empty server set: ${serverId}`);
        }

        this.metrics.currentConnections = this.getTotalClients();
        console.log(
          `[EventBus] Client unregistered from ${serverId}. ` +
          `Remaining connections: ${this.metrics.currentConnections}`
        );
      }
    } catch (error) {
      console.error("[EventBus] Error unregistering client:", error);
    }
  }

  /**
   * Broadcast an event to all connected WebSocket clients for a server
   * CORE: This is the main sync point - must be bulletproof
   * 
   * Called when:
   * - Discord command completes
   * - Dashboard action completes
   * - Server-wide announcements happen
   */
  broadcastToServer(event: BroadcastEvent): void {
    try {
      // Validate event
      if (!event || !event.type || !event.serverId) {
        console.warn("[EventBus] Invalid event structure:", event);
        this.failedBroadcasts++;
        return;
      }

      const clients = this.wsClients.get(event.serverId);

      // Update metrics
      this.metrics.totalBroadcasts++;
      this.metrics.lastEventTime = new Date();

      if (!clients || clients.size === 0) {
        console.debug(`[EventBus] No clients connected to ${event.serverId}`);
        return;
      }

      // Track successful sends
      let successCount = 0;
      let failCount = 0;

      clients.forEach((client: any) => {
        try {
          // Check if client is still valid and connected
          if (!client || client.readyState !== 1) {
            // WebSocket closed state - remove stale client
            clients.delete(client);
            return;
          }

          // Send event - JSON.stringify should never fail but guard anyway
          const payload = JSON.stringify(event);
          client.send(payload);
          successCount++;
        } catch (clientError) {
          failCount++;
          console.error(
            `[EventBus] Failed to send event to client: ${(clientError as Error).message}`
          );
        }
      });

      console.debug(
        `[EventBus] Broadcasted ${event.type} to ${event.serverId}: ` +
        `${successCount} success, ${failCount} failed`
      );

      // Emit as internal event for Discord bot listeners (never fail)
      try {
        this.emit(`broadcast:${event.serverId}`, event);
      } catch (emitError) {
        console.error("[EventBus] Error emitting internal event:", emitError);
      }
    } catch (error) {
      this.failedBroadcasts++;
      console.error("[EventBus] Critical error in broadcastToServer:", error);
    }
  }

  /**
   * Discord bot emits when a command is executed
   * This immediately broadcasts to all dashboard clients
   */
  emitDiscordCommand(event: DiscordEvent): void {
    try {
      if (!event || !event.type || !event.guildId) {
        console.warn("[EventBus] Invalid discord event:", event);
        return;
      }

      const { type, guildId, timestamp, ...rest } = event;
      this.metrics.totalEvents++;

      this.broadcastToServer({
        type: `discord:${type}`,
        serverId: guildId,
        timestamp: timestamp || new Date(),
        ...rest,
      });
    } catch (error) {
      console.error("[EventBus] Error in emitDiscordCommand:", error);
    }
  }

  /**
   * Dashboard emits when an action completes (purchase, mission, etc.)
   * This allows Discord bot to announce in server
   * CRITICAL: Ensures bidirectional sync
   */
  emitDashboardAction(event: BroadcastEvent): void {
    try {
      if (!event || !event.type || !event.serverId) {
        console.warn("[EventBus] Invalid dashboard action:", event);
        return;
      }

      this.metrics.totalEvents++;

      // Broadcast to all dashboard clients immediately
      this.broadcastToServer(event);

      // Emit for Discord bot listeners (internal event)
      // Never let internal listeners block the broadcast
      try {
        const { type, ...rest } = event;
        this.emit(`action:${type}`, { ...rest, type });
      } catch (emitError) {
        console.error("[EventBus] Error emitting action event:", emitError);
      }
    } catch (error) {
      console.error("[EventBus] Error in emitDashboardAction:", error);
    }
  }

  /**
   * Listen for discord command results to broadcast
   * Used by dashboard to react to bot events
   */
  onDiscordCommand(type: string, callback: (event: DiscordEvent) => void): void {
    try {
      if (!type || !callback) {
        console.warn("[EventBus] Invalid discord command listener registration");
        return;
      }
      this.on(`discord:${type}`, callback);
    } catch (error) {
      console.error("[EventBus] Error registering discord command listener:", error);
    }
  }

  /**
   * Listen for dashboard action results to announce in Discord
   * Used by Discord bot to react to dashboard events
   */
  onDashboardAction(type: string, callback: (event: BroadcastEvent) => void): void {
    try {
      if (!type || !callback) {
        console.warn("[EventBus] Invalid action listener registration");
        return;
      }
      this.on(`action:${type}`, callback);
    } catch (error) {
      console.error("[EventBus] Error registering action listener:", error);
    }
  }

  /**
   * Get all WebSocket clients for a server (for admin/debug)
   */
  getServerClients(serverId: string): number {
    try {
      return this.wsClients.get(serverId)?.size ?? 0;
    } catch (error) {
      console.error("[EventBus] Error getting server clients:", error);
      return 0;
    }
  }

  /**
   * Get total connected clients across all servers
   */
  getTotalClients(): number {
    try {
      let total = 0;
      this.wsClients.forEach((clients) => (total += clients.size));
      return total;
    } catch (error) {
      console.error("[EventBus] Error getting total clients:", error);
      return 0;
    }
  }

  /**
   * Get metrics for monitoring (admin endpoint)
   */
  getMetrics(): EventBusMetrics {
    return {
      ...this.metrics,
      currentConnections: this.getTotalClients(),
    };
  }

  /**
   * Reset metrics (for testing/debugging)
   */
  resetMetrics(): void {
    this.metrics = {
      totalEvents: 0,
      totalBroadcasts: 0,
      currentConnections: 0,
      lastEventTime: null,
    };
    this.failedBroadcasts = 0;
    console.log("[EventBus] Metrics reset");
  }

  /**
   * Cleanup all connections (for graceful shutdown)
   * IMPORTANT: Must be called during application shutdown
   */
  shutdown(): void {
    try {
      console.log("[EventBus] Shutting down - closing all connections");
      this.wsClients.forEach((clients, serverId) => {
        clients.forEach((client) => {
          try {
            if (client && client.close) {
              client.close();
            }
          } catch (error) {
            console.error(`Error closing client for ${serverId}:`, error);
          }
        });
      });
      this.wsClients.clear();
      this.removeAllListeners();
      console.log("[EventBus] Shutdown complete");
    } catch (error) {
      console.error("[EventBus] Error during shutdown:", error);
    }
  }
}

export const eventBus = EventBus.getInstance();
