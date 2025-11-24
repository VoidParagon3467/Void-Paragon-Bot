import { storage } from './storage';
import { cultivationService } from './cultivation';

export class MissionService {
  private readonly DAILY_MISSIONS = [
    {
      title: 'Cultivation Practice',
      description: 'Send 50 messages to practice your cultivation',
      type: 'daily' as const,
      requirements: { messageCount: 50 },
      rewards: { items: [], bloodline: null },
      xpReward: 500,
      crystalReward: 100,
    },
    {
      title: 'Slay Shadow Beasts',
      description: 'Win 3 sparring matches to prove your strength',
      type: 'daily' as const,
      requirements: { sparWins: 3 },
      rewards: { items: [], bloodline: null },
      xpReward: 750,
      crystalReward: 150,
    },
    {
      title: 'Meditation Master',
      description: 'Stay active for 2 hours to complete deep meditation',
      type: 'daily' as const,
      requirements: { activeTime: 7200 }, // 2 hours in seconds
      rewards: { items: [], bloodline: null },
      xpReward: 400,
      crystalReward: 80,
    },
    {
      title: 'Void Crystal Collector',
      description: 'Earn 500 Void Crystals through various activities',
      type: 'daily' as const,
      requirements: { crystalsEarned: 500 },
      rewards: { items: [], bloodline: null },
      xpReward: 300,
      crystalReward: 200,
    },
    {
      title: 'Realm Explorer',
      description: 'Interact with 10 different channels',
      type: 'daily' as const,
      requirements: { channelInteractions: 10 },
      rewards: { items: [], bloodline: null },
      xpReward: 350,
      crystalReward: 75,
    },
  ];
  
  private readonly WEEKLY_MISSIONS = [
    {
      title: 'Faction War Participation',
      description: 'Participate in 5 faction battles this week',
      type: 'weekly' as const,
      requirements: { factionBattles: 5 },
      rewards: { items: [], bloodline: null },
      xpReward: 2000,
      crystalReward: 500,
    },
    {
      title: 'Breakthrough Master',
      description: 'Advance your cultivation realm',
      type: 'weekly' as const,
      requirements: { realmAdvancement: 1 },
      rewards: { items: [], bloodline: null },
      xpReward: 5000,
      crystalReward: 1000,
    },
    {
      title: 'Sparring Champion',
      description: 'Win 20 sparring matches',
      type: 'weekly' as const,
      requirements: { sparWins: 20 },
      rewards: { items: [], bloodline: null },
      xpReward: 3000,
      crystalReward: 750,
    },
    {
      title: 'Treasure Hunter',
      description: 'Purchase 5 items from the shop',
      type: 'weekly' as const,
      requirements: { itemsPurchased: 5 },
      rewards: { items: [], bloodline: null },
      xpReward: 1500,
      crystalReward: 400,
    },
    {
      title: 'Sect Contributor',
      description: 'Help 10 junior cultivators by sparring with them',
      type: 'weekly' as const,
      requirements: { helpNewbies: 10 },
      rewards: { items: [], bloodline: null },
      xpReward: 2500,
      crystalReward: 600,
    },
  ];
  
  private readonly MONTHLY_MISSIONS = [
    {
      title: 'Immortal Ascension',
      description: 'Reach the next major realm tier',
      type: 'monthly' as const,
      requirements: { majorRealmAdvancement: 1 },
      rewards: { items: [], bloodline: null },
      xpReward: 10000,
      crystalReward: 2500,
    },
    {
      title: 'Faction Leader',
      description: 'Lead your faction to victory in 3 faction wars',
      type: 'monthly' as const,
      requirements: { factionWins: 3 },
      rewards: { items: [], bloodline: null },
      xpReward: 8000,
      crystalReward: 2000,
    },
    {
      title: 'Legendary Warrior',
      description: 'Win 100 battles against opponents of higher realm',
      type: 'monthly' as const,
      requirements: { higherRealmWins: 100 },
      rewards: { items: [], bloodline: null },
      xpReward: 15000,
      crystalReward: 3000,
    },
    {
      title: 'Void Crystal Magnate',
      description: 'Accumulate 50,000 Void Crystals',
      type: 'monthly' as const,
      requirements: { crystalAccumulation: 50000 },
      rewards: { items: [], bloodline: null },
      xpReward: 5000,
      crystalReward: 5000,
    },
  ];
  
  async assignDailyMissions(userId: number): Promise<any[]> {
    const user = await storage.getUserWithDetails(userId);
    if (!user) throw new Error('User not found');
    
    const existingMissions = await storage.getUserMissions(userId);
    const activeDailies = existingMissions.filter(m => 
      m.mission.type === 'daily' && m.status === 'active'
    );
    
    // Don't assign if user already has daily missions
    if (activeDailies.length >= 3) {
      return activeDailies;
    }
    
    // Select 3 random daily missions
    const selectedMissions = this.getRandomMissions(this.DAILY_MISSIONS, 3);
    const assignedMissions = [];
    
    for (const missionTemplate of selectedMissions) {
      // Create mission if it doesn't exist
      const missions = await storage.getMissionsByServer(user.serverId);
      let mission = missions.find(m => m.title === missionTemplate.title);
      
      if (!mission) {
        mission = await storage.createItem({
          title: missionTemplate.title,
          description: missionTemplate.description,
          type: missionTemplate.type,
          requirements: missionTemplate.requirements,
          rewards: missionTemplate.rewards,
          xpReward: missionTemplate.xpReward,
          crystalReward: missionTemplate.crystalReward,
          serverId: user.serverId,
        });
      }
      
      // Assign to user
      const userMission = await storage.assignMission(userId, mission.id);
      assignedMissions.push(userMission);
    }
    
    return assignedMissions;
  }
  
  async assignWeeklyMissions(userId: number): Promise<any[]> {
    const user = await storage.getUserWithDetails(userId);
    if (!user) throw new Error('User not found');
    
    const existingMissions = await storage.getUserMissions(userId);
    const activeWeeklies = existingMissions.filter(m => 
      m.mission.type === 'weekly' && m.status === 'active'
    );
    
    if (activeWeeklies.length >= 2) {
      return activeWeeklies;
    }
    
    const selectedMissions = this.getRandomMissions(this.WEEKLY_MISSIONS, 2);
    const assignedMissions = [];
    
    for (const missionTemplate of selectedMissions) {
      const missions = await storage.getMissionsByServer(user.serverId);
      let mission = missions.find(m => m.title === missionTemplate.title);
      
      if (!mission) {
        mission = await storage.createItem({
          title: missionTemplate.title,
          description: missionTemplate.description,
          type: missionTemplate.type,
          requirements: missionTemplate.requirements,
          rewards: missionTemplate.rewards,
          xpReward: missionTemplate.xpReward,
          crystalReward: missionTemplate.crystalReward,
          serverId: user.serverId,
        });
      }
      
      const userMission = await storage.assignMission(userId, mission.id);
      assignedMissions.push(userMission);
    }
    
    return assignedMissions;
  }
  
  async assignMonthlyMissions(userId: number): Promise<any[]> {
    const user = await storage.getUserWithDetails(userId);
    if (!user) throw new Error('User not found');
    
    const existingMissions = await storage.getUserMissions(userId);
    const activeMonthlies = existingMissions.filter(m => 
      m.mission.type === 'monthly' && m.status === 'active'
    );
    
    if (activeMonthlies.length >= 1) {
      return activeMonthlies;
    }
    
    const selectedMissions = this.getRandomMissions(this.MONTHLY_MISSIONS, 1);
    const assignedMissions = [];
    
    for (const missionTemplate of selectedMissions) {
      const missions = await storage.getMissionsByServer(user.serverId);
      let mission = missions.find(m => m.title === missionTemplate.title);
      
      if (!mission) {
        mission = await storage.createItem({
          title: missionTemplate.title,
          description: missionTemplate.description,
          type: missionTemplate.type,
          requirements: missionTemplate.requirements,
          rewards: missionTemplate.rewards,
          xpReward: missionTemplate.xpReward,
          crystalReward: missionTemplate.crystalReward,
          serverId: user.serverId,
        });
      }
      
      const userMission = await storage.assignMission(userId, mission.id);
      assignedMissions.push(userMission);
    }
    
    return assignedMissions;
  }
  
  async updateMissionProgress(userId: number, progressType: string, value: number): Promise<void> {
    const userMissions = await storage.getUserMissions(userId);
    const activeMissions = userMissions.filter(m => m.status === 'active');
    
    for (const userMission of activeMissions) {
      const mission = userMission.mission;
      const requirements = mission.requirements as any;
      const currentProgress = (userMission.progress as any) || {};
      
      // Update progress based on type
      if (requirements[progressType]) {
        const newProgress = (currentProgress[progressType] || 0) + value;
        currentProgress[progressType] = newProgress;
        
        await storage.updateMissionProgress(userId, mission.id, currentProgress);
        
        // Check if mission is completed
        if (newProgress >= requirements[progressType]) {
          await this.completeMission(userId, mission.id);
        }
      }
    }
  }
  
  async completeMission(userId: number, missionId: number): Promise<{
    success: boolean;
    message?: string;
    mission?: any;
  }> {
    const userMissions = await storage.getUserMissions(userId);
    const userMission = userMissions.find(m => m.missionId === missionId);
    
    if (!userMission) {
      return { success: false, message: 'Mission not found' };
    }
    
    if (userMission.status !== 'active') {
      return { success: false, message: 'Mission is not active' };
    }
    
    const mission = userMission.mission;
    const user = await storage.getUserWithDetails(userId);
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    // Complete the mission
    await storage.completeMission(userId, missionId);
    
    // Grant rewards
    await storage.updateUser(userId, {
      xp: user.xp + mission.xpReward,
      voidCrystals: user.voidCrystals + mission.crystalReward,
    });
    
    // Activity log
    await storage.createActivity({
      userId,
      type: 'mission_completed',
      description: `Completed mission: ${mission.title}`,
      metadata: { missionId, xpReward: mission.xpReward, crystalReward: mission.crystalReward },
      serverId: user.serverId,
    });
    
    return {
      success: true,
      mission,
    };
  }
  
  private getRandomMissions(missions: any[], count: number): any[] {
    const shuffled = [...missions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
  
  async initializeServerMissions(serverId: string): Promise<void> {
    const allMissions = [
      ...this.DAILY_MISSIONS,
      ...this.WEEKLY_MISSIONS,
      ...this.MONTHLY_MISSIONS,
    ];
    
    for (const missionTemplate of allMissions) {
      await storage.createItem({
        title: missionTemplate.title,
        description: missionTemplate.description,
        type: missionTemplate.type,
        requirements: missionTemplate.requirements,
        rewards: missionTemplate.rewards,
        xpReward: missionTemplate.xpReward,
        crystalReward: missionTemplate.crystalReward,
        serverId: serverId,
      });
    }
  }
}

export const missionService = new MissionService();
