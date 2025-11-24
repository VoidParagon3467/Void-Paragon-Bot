import { storage } from './storage';
import { cultivationRealms } from '@shared/schema';

export class CultivationService {
  // Cultivation configuration exactly as user specified
  private readonly CULTIVATION_CONFIG = {
    "Connate Realm": { levels: 9, xp_per_level: 100, rank: "Outer Disciple" },
    "Yin Realm": { levels: 9, xp_per_level: 150, rank: "Outer Disciple" },
    "Yang Realm": { levels: 9, xp_per_level: 200, rank: "Outer Disciple" },
    "Spirit Realm": { levels: 9, xp_per_level: 300, rank: "Inner Disciple" },
    "Imperial Realm": { levels: 9, xp_per_level: 400, rank: "Inner Disciple" },
    "Deity Realm": { levels: 3, xp_per_level: 1200, rank: "Inner Disciple", bottleneck: true },
    "Dao Realm": { levels: 3, xp_per_level: 1500, rank: "Core Disciple" },
    "True Spirit Realm": { levels: 3, xp_per_level: 1700, rank: "Core Disciple" },
    "Martial Spirit Realm": { levels: 3, xp_per_level: 2000, rank: "Core Disciple", bottleneck: true },
    "Heavenly Spirit Realm": { levels: 3, xp_per_level: 2300, rank: "Guardian" },
    "True Emperor Realm": { levels: 3, xp_per_level: 2600, rank: "Guardian" },
    "Martial Emperor Realm": { levels: 3, xp_per_level: 3000, rank: "Guardian", bottleneck: true },
    "Heavenly Emperor Realm": { levels: 3, xp_per_level: 3400, rank: "Inheritor Disciple" },
    "Sovereign Emperor Realm": { levels: 3, xp_per_level: 3800, rank: "Elder" },
    "Divine Emperor Realm": { levels: 3, xp_per_level: 4200, rank: "Elder" },
    "Divine Lord Realm": { levels: 3, xp_per_level: 4600, rank: "Elder" },
    "Divine King Realm": { levels: 3, xp_per_level: 5000, rank: "Elder", bottleneck: true },
    "World King Realm": { levels: 3, xp_per_level: 6000, rank: "Great Elder" },
    "Immortal Ascension Realm": { levels: 9, xp_per_level: 7000, rank: "Great Elder" },
    "Immortal Lord Realm": { levels: 3, xp_per_level: 9000, rank: "Heavenly Elder" },
    "Immortal King Realm": { levels: 3, xp_per_level: 12000, rank: "Heavenly Elder", bottleneck: true },
    "Immortal Emperor Realm": { levels: 3, xp_per_level: 15000, rank: "Heavenly Elder" },
    "Immortal God Realm": { levels: 3, xp_per_level: 20000, rank: "Heavenly Elder" },
    "GodKing Realm": { levels: 3, xp_per_level: 25000, rank: "Heavenly Elder" },
    "True God Realm": { levels: 1, xp_per_level: Number.POSITIVE_INFINITY, rank: "Supreme Sect Master" }
  };
  
  getXpRequirement(realm: string, level: number): number {
    const config = this.CULTIVATION_CONFIG[realm as keyof typeof this.CULTIVATION_CONFIG];
    if (!config) return 1000;
    return config.xp_per_level;
  }
  
  async gainChatXp(userId: number, messageLength: number): Promise<{
    user: any;
    xpGained: number;
    levelUp: boolean;
    realmAdvancement?: boolean;
  }> {
    const user = await storage.getUserWithDetails(userId);
    if (!user) throw new Error('User not found');
    
    // Calculate XP gain based on message length
    const baseXp = Math.min(Math.floor(messageLength / 10), 50); // 1 XP per 10 chars, max 50
    const rebirthMultiplier = 1 + (user.rebirthCount * 0.1);
    const xpGained = Math.floor(baseXp * rebirthMultiplier);
    
    const newXp = user.xp + xpGained;
    const requiredXp = this.getXpRequirement(user.realm, user.level);
    const config = this.CULTIVATION_CONFIG[user.realm as keyof typeof this.CULTIVATION_CONFIG];
    
    let levelUp = false;
    let realmAdvancement = false;
    let newLevel = user.level;
    let newRealm = user.realm;
    let newRank = user.rank;
    let crystalsGained = 0;
    
    if (newXp >= requiredXp) {
      // Check if we can level up within current realm
      if (newLevel < config.levels) {
        levelUp = true;
        newLevel = user.level + 1;
        crystalsGained = Math.floor(newLevel * 1.5);
        
        // Update rank if needed
        newRank = config.rank;
        
        // Activity log
        await storage.createActivity({
          userId,
          type: 'level_up',
          description: `Reached level ${newLevel} in ${user.realm}`,
          metadata: { oldLevel: user.level, newLevel, realm: user.realm },
          serverId: user.serverId,
        });
      } else {
        // Try to advance to next realm
        const currentRealmIndex = cultivationRealms.indexOf(user.realm as any);
        if (currentRealmIndex < cultivationRealms.length - 1) {
          realmAdvancement = true;
          newRealm = cultivationRealms[currentRealmIndex + 1];
          newLevel = 1;
          const nextConfig = this.CULTIVATION_CONFIG[newRealm as keyof typeof this.CULTIVATION_CONFIG];
          newRank = nextConfig.rank;
          crystalsGained = Math.floor(100 * (currentRealmIndex + 1));
          
          // Activity log
          await storage.createActivity({
            userId,
            type: 'realm_advancement',
            description: `Advanced to ${newRealm}!`,
            metadata: { oldRealm: user.realm, newRealm, newRank },
            serverId: user.serverId,
          });
        }
      }
    }
    
    const updatedUser = await storage.updateUser(userId, {
      xp: realmAdvancement ? 0 : newXp, // Reset XP on realm advancement
      level: newLevel,
      realm: newRealm,
      rank: newRank,
      voidCrystals: user.voidCrystals + crystalsGained,
    });
    
    return {
      user: updatedUser,
      xpGained,
      levelUp: levelUp || realmAdvancement,
      realmAdvancement,
    };
  }
  
  async advanceRealm(userId: number): Promise<{
    success: boolean;
    message?: string;
    user?: any;
    crystalsGained?: number;
  }> {
    const user = await storage.getUserWithDetails(userId);
    if (!user) throw new Error('User not found');
    
    const currentRealmIndex = cultivationRealms.indexOf(user.realm as any);
    if (currentRealmIndex === -1) {
      return { success: false, message: 'Invalid current realm' };
    }
    
    if (currentRealmIndex >= cultivationRealms.length - 1) {
      return { success: false, message: 'You have reached the highest realm!' };
    }
    
    const nextRealm = cultivationRealms[currentRealmIndex + 1];
    const currentConfig = this.CULTIVATION_CONFIG[user.realm as keyof typeof this.CULTIVATION_CONFIG];
    const nextConfig = this.CULTIVATION_CONFIG[nextRealm as keyof typeof this.CULTIVATION_CONFIG];
    
    if (!currentConfig || !nextConfig) {
      return { success: false, message: 'Invalid realm configuration' };
    }
    
    if (user.level < currentConfig.levels) {
      return { 
        success: false, 
        message: `You need to reach level ${currentConfig.levels} in ${user.realm} to advance to ${nextRealm}` 
      };
    }
    
    const crystalCost = Math.floor(1000 * (currentRealmIndex + 1));
    if (user.voidCrystals < crystalCost) {
      return { 
        success: false, 
        message: `You need ${crystalCost} Void Crystals to advance to ${nextRealm}` 
      };
    }
    
    const crystalsGained = Math.floor(crystalCost * 0.1);
    
    const updatedUser = await storage.updateUser(userId, {
      realm: nextRealm,
      level: 1, // Reset to level 1 in new realm
      xp: 0, // Reset XP for new realm
      rank: nextConfig.rank,
      voidCrystals: user.voidCrystals - crystalCost + crystalsGained,
    });
    
    // Activity log
    await storage.createActivity({
      userId,
      type: 'realm_advancement',
      description: `Advanced to ${nextRealm} realm`,
      metadata: { oldRealm: user.realm, newRealm: nextRealm },
      serverId: user.serverId,
    });
    
    return {
      success: true,
      user: updatedUser,
      crystalsGained,
    };
  }
  
  async initiateBattle(attackerId: number, defenderId: number, battleType: 'spar' | 'faction_war' | 'mission' | 'duel'): Promise<{
    result: 'win' | 'lose' | 'draw';
    narrative: string;
    xpGained: number;
    crystalsGained: number;
  }> {
    const attacker = await storage.getUserWithDetails(attackerId);
    const defender = await storage.getUserWithDetails(defenderId);
    
    if (!attacker || !defender) throw new Error('User not found');
    
    // Calculate battle power including equipment bonuses
    const attackerItems = await storage.getUserItems(attackerId);
    const defenderItems = await storage.getUserItems(defenderId);
    
    const attackerEquipped = attackerItems.filter(ui => ui.isEquipped);
    const defenderEquipped = defenderItems.filter(ui => ui.isEquipped);
    
    // Calculate battle strength based on cultivation level and equipped items
    const attackerRealmIndex = cultivationRealms.indexOf(attacker.realm as any);
    const defenderRealmIndex = cultivationRealms.indexOf(defender.realm as any);
    
    const attackerBasePower = (attackerRealmIndex * 1000) + (attacker.level * 100);
    const defenderBasePower = (defenderRealmIndex * 1000) + (defender.level * 100);
    
    const attackerItemBonus = attackerEquipped.reduce((sum, ui) => sum + (ui.item.powerBonus || 0), 0);
    const defenderItemBonus = defenderEquipped.reduce((sum, ui) => sum + (ui.item.powerBonus || 0), 0);
    
    const attackerTotalPower = attackerBasePower + attackerItemBonus;
    const defenderTotalPower = defenderBasePower + defenderItemBonus;
    
    // Battle calculation with randomness
    const attackerScore = attackerTotalPower * (0.8 + Math.random() * 0.4);
    const defenderScore = defenderTotalPower * (0.8 + Math.random() * 0.4);
    
    let result: 'win' | 'lose' | 'draw';
    let narrative: string;
    let xpGained = 0;
    let crystalsGained = 0;
    
    if (Math.abs(attackerScore - defenderScore) < attackerTotalPower * 0.05) {
      result = 'draw';
      narrative = this.generateBattleNarrative(attacker, defender, 'draw');
      xpGained = 50;
      crystalsGained = 25;
    } else if (attackerScore > defenderScore) {
      result = 'win';
      narrative = this.generateBattleNarrative(attacker, defender, 'win');
      xpGained = 100 + Math.floor(defender.level * 2);
      crystalsGained = 50 + Math.floor(defender.level);
    } else {
      result = 'lose';
      narrative = this.generateBattleNarrative(attacker, defender, 'lose');
      xpGained = 25 + Math.floor(defender.level);
      crystalsGained = 10;
    }
    
    // Update attacker stats
    await storage.updateUser(attackerId, {
      xp: attacker.xp + xpGained,
      voidCrystals: attacker.voidCrystals + crystalsGained,
    });
    
    // Create battle record
    await storage.createBattle({
      attacker: attackerId,
      defender: defenderId,
      type: battleType,
      result,
      narrative,
      xpGained,
      crystalsGained,
      serverId: attacker.serverId,
    });
    
    // Activity logs
    await storage.createActivity({
      userId: attackerId,
      type: 'battle',
      description: `${result === 'win' ? 'Won' : result === 'lose' ? 'Lost' : 'Drew'} battle against ${defender.username}`,
      metadata: { opponent: defender.username, result },
      serverId: attacker.serverId,
    });
    
    return {
      result,
      narrative,
      xpGained,
      crystalsGained,
    };
  }
  
  private generateBattleNarrative(attacker: any, defender: any, result: 'win' | 'lose' | 'draw'): string {
    const narratives = {
      win: [
        `${attacker.username} channels their ${attacker.realm} cultivation, overwhelming ${defender.username} with a devastating technique!`,
        `With a flash of spiritual energy, ${attacker.username} breaks through ${defender.username}'s defenses and claims victory!`,
        `${attacker.username}'s superior cultivation shines through as they dominate the battle against ${defender.username}!`,
      ],
      lose: [
        `Despite their best efforts, ${attacker.username} is defeated by ${defender.username}'s superior techniques!`,
        `${defender.username}'s ${defender.realm} cultivation proves too powerful for ${attacker.username} to overcome!`,
        `${attacker.username} fights valiantly but ultimately falls to ${defender.username}'s overwhelming power!`,
      ],
      draw: [
        `Both ${attacker.username} and ${defender.username} display exceptional skill, resulting in an honorable draw!`,
        `The battle between ${attacker.username} and ${defender.username} ends in a stalemate, both warriors respecting each other's strength!`,
        `Neither ${attacker.username} nor ${defender.username} can claim victory in this evenly matched battle!`,
      ],
    };
    
    const selectedNarratives = narratives[result];
    return selectedNarratives[Math.floor(Math.random() * selectedNarratives.length)];
  }
  
  async purchaseItem(userId: number, itemId: number, quantity = 1): Promise<{
    success: boolean;
    message?: string;
    item?: any;
  }> {
    const user = await storage.getUserWithDetails(userId);
    const item = await storage.getItemById(itemId);
    
    if (!user || !item) {
      return { success: false, message: 'User or item not found' };
    }
    
    const totalCost = item.price * quantity;
    
    if (user.voidCrystals < totalCost) {
      return { 
        success: false, 
        message: `Insufficient Void Crystals. Need ${totalCost}, have ${user.voidCrystals}` 
      };
    }
    
    // Deduct crystals
    await storage.updateUser(userId, {
      voidCrystals: user.voidCrystals - totalCost,
    });
    
    // Add item to inventory
    await storage.addItemToUser(userId, itemId, quantity);
    
    // Activity log
    await storage.createActivity({
      userId,
      type: 'item_purchase',
      description: `Purchased ${quantity}x ${item.name}`,
      metadata: { itemId, quantity, cost: totalCost },
      serverId: user.serverId,
    });
    
    return {
      success: true,
      item,
    };
  }
  
  async initiateRebirth(userId: number): Promise<{
    success: boolean;
    message?: string;
    user?: any;
    bonusMultiplier?: number;
  }> {
    const user = await storage.getUserWithDetails(userId);
    if (!user) throw new Error('User not found');
    
    // Check if user meets rebirth requirements
    const currentRealmIndex = cultivationRealms.indexOf(user.realm as any);
    if (currentRealmIndex < 10) { // Must be at least Transcendence realm
      return { 
        success: false, 
        message: 'You must reach at least the Transcendence realm to undergo rebirth' 
      };
    }
    
    if (user.level < 100) {
      return { 
        success: false, 
        message: 'You must reach level 100 to undergo rebirth' 
      };
    }
    
    // Calculate rebirth bonuses
    const bonusMultiplier = 1 + (user.rebirthCount * 0.1);
    
    // Reset user stats but keep rebirth count and some bonuses
    const updatedUser = await storage.updateUser(userId, {
      realm: 'Connate Realm',
      level: 1,
      xp: 0,
      rank: 'Outer Disciple',
      rebirthCount: user.rebirthCount + 1,
      voidCrystals: user.voidCrystals + 10000, // Rebirth bonus crystals
    });
    
    // Activity log
    await storage.createActivity({
      userId,
      type: 'rebirth',
      description: `Underwent rebirth (${user.rebirthCount + 1} times)`,
      metadata: { rebirthCount: user.rebirthCount + 1, bonusMultiplier },
      serverId: user.serverId,
    });
    
    return {
      success: true,
      user: updatedUser,
      bonusMultiplier,
    };
  }
}

export const cultivationService = new CultivationService();
