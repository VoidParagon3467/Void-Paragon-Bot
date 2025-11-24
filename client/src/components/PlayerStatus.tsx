import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface PlayerStatusProps {
  user: any;
}

export default function PlayerStatus({ user }: PlayerStatusProps) {
  // Cultivation realm configuration - matching your exact specifications
  const realmConfig = {
    "Connate Realm": { levels: 9, xp_per_level: 100, rank: "Outer Disciple" },
    "Yin Realm": { levels: 9, xp_per_level: 150, rank: "Outer Disciple" },
    "Yang Realm": { levels: 9, xp_per_level: 200, rank: "Outer Disciple" },
    "Spirit Realm": { levels: 9, xp_per_level: 300, rank: "Inner Disciple" },
    "Imperial Realm": { levels: 9, xp_per_level: 400, rank: "Inner Disciple" },
    "Deity Realm": { levels: 3, xp_per_level: 1200, rank: "Inner Disciple" },
    "Dao Realm": { levels: 3, xp_per_level: 1500, rank: "Core Disciple" },
    "True Spirit Realm": { levels: 3, xp_per_level: 1700, rank: "Core Disciple" },
    "Martial Spirit Realm": { levels: 3, xp_per_level: 2000, rank: "Core Disciple" },
    "Heavenly Spirit Realm": { levels: 3, xp_per_level: 2300, rank: "Guardian" },
    "True Emperor Realm": { levels: 3, xp_per_level: 2600, rank: "Guardian" },
    "Martial Emperor Realm": { levels: 3, xp_per_level: 3000, rank: "Guardian" },
    "Heavenly Emperor Realm": { levels: 3, xp_per_level: 3400, rank: "Inheritor Disciple" },
    "Sovereign Emperor Realm": { levels: 3, xp_per_level: 3800, rank: "Elder" },
    "Divine Emperor Realm": { levels: 3, xp_per_level: 4200, rank: "Elder" },
    "Divine Lord Realm": { levels: 3, xp_per_level: 4600, rank: "Elder" },
    "Divine King Realm": { levels: 3, xp_per_level: 5000, rank: "Elder" },
    "World King Realm": { levels: 3, xp_per_level: 6000, rank: "Great Elder" },
    "Immortal Ascension Realm": { levels: 9, xp_per_level: 7000, rank: "Great Elder" },
    "Immortal Lord Realm": { levels: 3, xp_per_level: 9000, rank: "Heavenly Elder" },
    "Immortal King Realm": { levels: 3, xp_per_level: 12000, rank: "Heavenly Elder" },
    "Immortal Emperor Realm": { levels: 3, xp_per_level: 15000, rank: "Heavenly Elder" },
    "Immortal God Realm": { levels: 3, xp_per_level: 20000, rank: "Heavenly Elder" },
    "GodKing Realm": { levels: 3, xp_per_level: 25000, rank: "Heavenly Elder" },
    "True God Realm": { levels: 1, xp_per_level: Number.POSITIVE_INFINITY, rank: "Supreme Sect Master" }
  };

  const config = realmConfig[user.realm as keyof typeof realmConfig];
  const nextLevelXp = config ? config.xp_per_level : 1000;
  const xpProgress = (user.xp / nextLevelXp) * 100;
  const currentRank = user.rank || (config ? config.rank : "Outer Disciple");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <div className="lg:col-span-2">
        <Card className="glass-card border-primary/30">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold cultivation-glow font-mono">
                  {user.username}
                </h1>
                <p className="text-primary text-lg">{user.realm}</p>
                <p className="text-muted-foreground text-sm">Level {user.level}</p>
              </div>
              <Badge className="mt-4 sm:mt-0 bg-gradient-to-r from-purple-500 to-purple-600">
                {currentRank}
              </Badge>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Cultivation Progress</span>
                  <span className="text-sm font-semibold text-primary">
                    {user.xp?.toLocaleString()} / {nextLevelXp.toLocaleString()} XP
                  </span>
                </div>
                <Progress value={xpProgress} className="h-3" />
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400 font-mono">
                    {user.voidCrystals?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Void Crystals</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary font-mono">
                    {user.spiritPoints?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Spirit Points</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400 font-mono">
                    {user.karma?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Karma</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400 font-mono">
                    {user.fate?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Fate</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="space-y-6">
        <Card className="glass-card border-primary/30">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4 font-mono">Bloodline</h3>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center animate-pulse-slow">
                <i className="fas fa-dragon text-2xl text-black" />
              </div>
              <div className="bloodline-rare text-lg font-semibold">
                {user.bloodline?.name || "Ancient Dragon"}
              </div>
              <div className="text-sm text-muted-foreground">
                {user.bloodline?.rarity || "Legendary"}
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                +25% Fire Damage<br />
                +15% Defense<br />
                Dragon Breath Ability
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card border-primary/30">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4 font-mono">Faction</h3>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-primary to-blue-400 rounded-lg flex items-center justify-center">
                <i className="fas fa-mountain text-xl text-white" />
              </div>
              <div className="text-primary font-semibold">
                {user.faction?.name || "Celestial Peak"}
              </div>
              <div className="text-sm text-muted-foreground">
                Rank: {user.factionRank || "Elder"}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Members: {user.faction?.memberCount || 127}<br />
                War Points: {user.faction?.warPoints?.toLocaleString() || "8,945"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
