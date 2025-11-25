import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Crown, Zap, Users, Shield, Flame, Gem, Award, TrendingUp, 
  Settings, Eye, Unlock, ChevronRight, AlertCircle, Lock, LogIn
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";

interface User {
  id: string;
  discordId: string;
  serverId: string;
  username: string;
  rank: string;
  realm: string;
  level: number;
  xp: number;
  power: number;
  defense: number;
  agility: number;
  wisdom: number;
  voidCrystals: number;
  sectPoints: number;
  factionId?: string | null;
  factionName?: string;
  factionRank?: string;
  clanId?: string | null;
  clanName?: string;
  clanRole?: string;
  isSupremeSectMaster?: boolean;
}

interface ServerSettings {
  sectMasterId: string;
}

const rankHierarchy: Record<string, { level: number; multiplier: number; permissions: string[] }> = {
  "Supreme Sect Master": { level: 15, multiplier: 100, permissions: ["all"] },
  "Heavenly Elder": { level: 14, multiplier: 8, permissions: ["events", "moderation", "shop", "treasury", "clan_creation"] },
  "Great Elder": { level: 13, multiplier: 6, permissions: ["events", "moderation", "treasury", "clan_creation"] },
  "Elder": { level: 12, multiplier: 4, permissions: ["moderation", "treasury"] },
  "Core Disciple": { level: 11, multiplier: 3, permissions: ["treasury"] },
  "Inheritor Disciple": { level: 9, multiplier: 1.5, permissions: ["faction_creation"] },
  "Guardian": { level: 10, multiplier: 2, permissions: [] },
  "Inner Disciple": { level: 8, multiplier: 1.2, permissions: [] },
  "Outer Disciple": { level: 1, multiplier: 1, permissions: [] },
};

const rankProgression = [
  "Outer Disciple",
  "Inner Disciple",
  "Inheritor Disciple",
  "Core Disciple",
  "Elder",
  "Great Elder",
  "Heavenly Elder",
  "Supreme Sect Master",
];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    // Get session token from URL or localStorage
    const params = new URLSearchParams(window.location.search);
    const urlSession = params.get("session");
    const storedSession = sessionStorage.getItem("auth_session");
    
    if (urlSession) {
      setSessionToken(urlSession);
      sessionStorage.setItem("auth_session", urlSession);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (storedSession) {
      setSessionToken(storedSession);
    }
  }, []);

  const { data: user, isLoading: userLoading } = useQuery<User | null>({
    queryKey: [`/api/auth/me`, sessionToken],
    queryFn: async () => {
      if (!sessionToken) return null;
      const res = await fetch(`/api/auth/me?session=${sessionToken}`);
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled: !!sessionToken,
  });

  const { data: serverSettings } = useQuery<ServerSettings | null>({
    queryKey: [`/api/server-settings/${user?.serverId}`],
    retry: false,
    enabled: !!user?.serverId,
  });

  const isSectMaster = user?.isSupremeSectMaster || serverSettings?.sectMasterId === user?.discordId;
  const userRank = user?.rank || "Outer Disciple";
  const rankInfo = rankHierarchy[userRank as keyof typeof rankHierarchy] || rankHierarchy["Outer Disciple"];
  
  const currentRankIndex = rankProgression.indexOf(userRank);
  const nextRankIndex = Math.min(currentRankIndex + 1, rankProgression.length - 1);
  const nextRank = rankProgression[nextRankIndex];
  const nextRankInfo = rankHierarchy[nextRank as keyof typeof rankHierarchy];

  const nextLevelXp = Math.floor((user?.level || 1) * 100 * (1.5 ** (user?.level || 1))) || 1000;
  const xpProgress = Math.min(((user?.xp || 0) / nextLevelXp) * 100, 100);

  const hasPermission = (permission: string) => {
    if (isSectMaster) return true;
    return rankInfo.permissions.includes(permission);
  };

  const canCreateFaction = rankInfo.level >= 9;
  const canCreateClan = rankInfo.level >= 13;

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin mx-auto" />
          <p className="text-slate-400">Loading your cultivation data...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md space-y-8">
          <div>
            <Crown className="w-16 h-16 text-purple-500 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-white mb-2">Void Paragon</h1>
            <p className="text-slate-400">Join a Discord server with the Void Paragon Bot to begin your cultivation journey</p>
          </div>
          <Button 
            onClick={() => window.location.href = "/api/auth/login"}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-6 text-lg"
            data-testid="button-discord-login"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Login with Discord
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 border-b border-purple-900/50 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Crown className="w-6 h-6 text-purple-500" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {isSectMaster ? "Supreme Control Center" : "Cultivation Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isSectMaster && (
              <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 flex items-center gap-1">
                <Eye className="w-3 h-3" /> Supreme Master
              </Badge>
            )}
            <Badge className={`border-0 text-white ${
              rankInfo.level >= 14 ? "bg-gradient-to-r from-yellow-500 to-orange-500" :
              rankInfo.level >= 12 ? "bg-gradient-to-r from-purple-500 to-pink-500" :
              rankInfo.level >= 10 ? "bg-gradient-to-r from-blue-500 to-cyan-500" :
              "bg-gradient-to-r from-slate-500 to-slate-600"
            }`}>
              {userRank}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* HERO PROFILE */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
          <Card className="relative border-purple-500/30 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
            <CardContent className="p-8 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                  <h2 className="text-4xl font-bold text-white mb-1">{user.username}</h2>
                  <p className="text-purple-300 text-lg mb-4">{user.realm} • Level {user.level}</p>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">Cultivation Progress</span>
                        <span className="text-purple-300 font-mono">{user.xp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP</span>
                      </div>
                      <Progress value={xpProgress} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                        <p className="text-slate-400 text-xs mb-1">Power</p>
                        <p className="text-lg font-bold text-green-400">{user.power}</p>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                        <p className="text-slate-400 text-xs mb-1">Defense</p>
                        <p className="text-lg font-bold text-blue-400">{user.defense}</p>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                        <p className="text-slate-400 text-xs mb-1">Agility</p>
                        <p className="text-lg font-bold text-yellow-400">{user.agility}</p>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                        <p className="text-slate-400 text-xs mb-1">Wisdom</p>
                        <p className="text-lg font-bold text-purple-400">{user.wisdom}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-3">Current Rank</p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-bold">{userRank}</span>
                      <span className="text-purple-300 font-mono text-sm">Lvl {rankInfo.level}</span>
                    </div>
                    <div className="text-xs space-y-1 text-slate-300">
                      <p>• VC Multiplier: {rankInfo.multiplier}x</p>
                      <p>• Permissions: {rankInfo.permissions.length}</p>
                    </div>
                  </div>

                  {nextRankIndex < rankProgression.length - 1 && (
                    <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-lg p-4">
                      <p className="text-slate-400 text-sm mb-3">Next Rank</p>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-white font-bold">{nextRank}</span>
                        <ChevronRight className="w-4 h-4 text-blue-300" />
                      </div>
                      <div className="text-xs space-y-1 text-slate-300 mb-3">
                        <p>• VC Multiplier: {nextRankInfo?.multiplier}x</p>
                        <p>• New Permissions: +{(nextRankInfo?.permissions?.length || 0)}</p>
                      </div>
                      <div className="pt-3 border-t border-blue-500/20">
                        <p className="text-blue-300 font-semibold text-xs">Requirements:</p>
                        <p className="text-slate-400 text-xs mt-1">Reach Level 50 + 100k XP</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-lg p-3">
                      <p className="text-slate-400 text-xs mb-1">Void Crystals</p>
                      <p className="text-lg font-bold text-purple-300">{user.voidCrystals}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-lg p-3">
                      <p className="text-slate-400 text-xs mb-1">Sect Points</p>
                      <p className="text-lg font-bold text-blue-300">{user.sectPoints || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* QUICK ACTIONS - EVERYONE */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" /> Quick Access
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/missions" data-testid="link-missions">
              <Card className="border-slate-700/50 bg-slate-900/50 hover:bg-slate-900/70 cursor-pointer transition-all h-full group">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-lg group-hover:from-purple-500/30 group-hover:to-purple-600/20">
                      <Flame className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">Missions</p>
                      <p className="text-slate-400 text-xs">Daily tasks</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/inventory" data-testid="link-inventory">
              <Card className="border-slate-700/50 bg-slate-900/50 hover:bg-slate-900/70 cursor-pointer transition-all h-full group">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-lg group-hover:from-blue-500/30 group-hover:to-blue-600/20">
                      <Gem className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">Inventory</p>
                      <p className="text-slate-400 text-xs">Your items</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* SPAR - AVAILABLE TO EVERYONE */}
            <Link href="/spar" data-testid="link-spar">
              <Card className="border-slate-700/50 bg-slate-900/50 hover:bg-slate-900/70 cursor-pointer transition-all h-full group">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-lg group-hover:from-red-500/30 group-hover:to-red-600/20">
                      <Flame className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">Spar</p>
                      <p className="text-slate-400 text-xs">Battle others</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* SHOP - LIMITED FOR LOW RANKS */}
            <Card className={`border-yellow-700/50 cursor-pointer transition-all h-full group ${
              hasPermission("shop") ? "bg-slate-900/50 hover:bg-slate-900/70" : "bg-slate-900/30 opacity-60"
            }`} data-testid="card-shop">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    hasPermission("shop") 
                      ? "bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 group-hover:from-yellow-500/30 group-hover:to-yellow-600/20"
                      : "bg-slate-700/30"
                  }`}>
                    {hasPermission("shop") ? (
                      <Gem className="w-5 h-5 text-yellow-400" />
                    ) : (
                      <Lock className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Shop</p>
                    <p className="text-slate-400 text-xs">
                      {hasPermission("shop") ? "Buy items" : "Unlock at Core Disciple"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ACTIVE EVENTS - EVERYONE */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-400" /> Active Events
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/5">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-blue-300 font-semibold text-sm">Void Sect Defense</p>
                    <p className="text-slate-400 text-xs">Alien invasion event</p>
                  </div>
                  <Badge className="bg-blue-500/30 text-blue-300 border-blue-500/50">Active</Badge>
                </div>
                <p className="text-slate-400 text-xs mb-3">Defenders: 12 disciples • Req: Spirit Realm+</p>
                <Button size="sm" data-testid="button-join-event">Join Defense</Button>
              </CardContent>
            </Card>

            <Card className="border-green-500/30 bg-gradient-to-br from-green-500/10 to-green-600/5">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-green-300 font-semibold text-sm">Treasure Hunt</p>
                    <p className="text-slate-400 text-xs">Find hidden treasures</p>
                  </div>
                  <Badge className="bg-green-500/30 text-green-300 border-green-500/50">Active</Badge>
                </div>
                <p className="text-slate-400 text-xs mb-3">Participants: 28 • Ends in 2 hours</p>
                <Button size="sm" data-testid="button-join-treasure">Join Now</Button>
              </CardContent>
            </Card>
          </div>

          {hasPermission("events") && (
            <div className="mt-4">
              <Button size="sm" variant="outline" data-testid="button-create-event" className="w-full">
                Create New Event
              </Button>
            </div>
          )}
        </div>

        {/* FACTION & CLAN - EVERYONE CAN JOIN */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" /> Organizations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* FACTION */}
            {user.factionId ? (
              <Card className="border-purple-500/30 bg-slate-900/50">
                <CardContent className="p-4">
                  <p className="text-slate-400 text-xs mb-2">FACTION</p>
                  <p className="text-white font-bold mb-2">{user.factionName}</p>
                  <p className="text-slate-400 text-sm mb-3">Role: {user.factionRank}</p>
                  <Button size="sm" variant="outline" data-testid="button-faction-details">View Faction</Button>
                </CardContent>
              </Card>
            ) : (
              <Card className={`border-purple-700/50 ${canCreateFaction ? "bg-slate-900/50" : "bg-slate-900/30 opacity-60"}`}>
                <CardContent className="p-4">
                  <p className="text-slate-400 text-xs mb-2">CREATE FACTION</p>
                  {canCreateFaction ? (
                    <>
                      <p className="text-purple-300 font-semibold text-sm mb-2">Build Your Faction</p>
                      <p className="text-slate-400 text-xs mb-3">Requires: Faction Token (VC + SP)</p>
                      <Button size="sm" data-testid="button-create-faction">Create Faction</Button>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-400 font-semibold text-sm mb-2">Locked</p>
                      <p className="text-slate-500 text-xs">Requires: Inheritor Disciple Rank</p>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* CLAN */}
            {user.clanId ? (
              <Card className="border-orange-500/30 bg-slate-900/50">
                <CardContent className="p-4">
                  <p className="text-slate-400 text-xs mb-2">CLAN</p>
                  <p className="text-white font-bold mb-2">{user.clanName}</p>
                  <p className="text-slate-400 text-sm mb-3">Position: {user.clanRole}</p>
                  <Button size="sm" variant="outline" data-testid="button-clan-details">View Clan</Button>
                </CardContent>
              </Card>
            ) : (
              <Card className={`border-orange-700/50 ${canCreateClan ? "bg-slate-900/50" : "bg-slate-900/30 opacity-60"}`}>
                <CardContent className="p-4">
                  <p className="text-slate-400 text-xs mb-2">CREATE CLAN</p>
                  {canCreateClan ? (
                    <>
                      <p className="text-orange-300 font-semibold text-sm mb-2">Establish Your Clan</p>
                      <p className="text-slate-400 text-xs mb-3">Requires: Clan Token (SP + Karma)</p>
                      <Button size="sm" data-testid="button-create-clan">Create Clan</Button>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-400 font-semibold text-sm mb-2">Locked</p>
                      <p className="text-slate-500 text-xs">Requires: Great Elder+ Rank</p>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {(user.factionId || user.clanId) && (
            <p className="text-xs text-slate-400 mt-3">
              💡 Purchase faction/clan leaving tokens to switch organizations (expensive!)
            </p>
          )}
        </div>

        {/* PREMIUM FEATURES - LIMITED FOR LOW RANKS */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" /> Premium Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {["Treasures", "Bloodlines", "Divine Bodies", "Custom Titles", "Card Personalization", "Cosmetics"].map((feature) => (
              <Card 
                key={feature}
                className={`border-yellow-700/50 ${
                  rankInfo.level > 2 ? "bg-slate-900/50" : "bg-slate-900/30 opacity-60"
                }`}
                data-testid={`card-premium-${feature.toLowerCase()}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-white font-semibold text-sm">{feature}</p>
                    {rankInfo.level <= 2 && <Lock className="w-4 h-4 text-slate-400" />}
                  </div>
                  <p className="text-slate-400 text-xs mb-3">
                    {rankInfo.level > 2 ? "Available for your rank" : "Limited for Outer/Inner Disciples"}
                  </p>
                  <Button size="sm" variant="outline" data-testid={`button-${feature.toLowerCase()}`} disabled={rankInfo.level <= 2}>
                    View
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ROLE-SPECIFIC FEATURES */}
        <div className="space-y-8">
          
          {/* TREASURY */}
          {hasPermission("treasury") && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Gem className="w-5 h-5 text-purple-400" /> Treasury Management
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-slate-700/50 bg-slate-900/50">
                  <CardContent className="p-4">
                    <p className="text-slate-400 text-sm mb-2">Sect Treasury</p>
                    <p className="text-3xl font-bold text-purple-300 mb-2">50,000 VC</p>
                    <Button size="sm" variant="outline" data-testid="button-manage-treasury">Manage</Button>
                  </CardContent>
                </Card>
                <Card className="border-slate-700/50 bg-slate-900/50">
                  <CardContent className="p-4">
                    <p className="text-slate-400 text-sm mb-2">Daily Distribution</p>
                    <p className="text-3xl font-bold text-blue-300 mb-2">5,000 VC</p>
                    <Button size="sm" variant="outline" data-testid="button-treasury-settings">Settings</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* MODERATION */}
          {hasPermission("moderation") && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-400" /> Moderation Panel
              </h3>
              <Card className="border-slate-700/50 bg-slate-900/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <div>
                      <p className="text-white font-semibold text-sm">User Strikes</p>
                      <p className="text-slate-400 text-xs">3-strike moderation system</p>
                    </div>
                    <Button size="sm" variant="outline" data-testid="button-manage-strikes">Manage</Button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <div>
                      <p className="text-white font-semibold text-sm">Ban List</p>
                      <p className="text-slate-400 text-xs">View banned members</p>
                    </div>
                    <Button size="sm" variant="outline" data-testid="button-manage-bans">View</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* SUPREME MASTER */}
          {isSectMaster && (
            <div className="border-l-4 border-red-500 bg-gradient-to-r from-red-500/10 to-transparent p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Crown className="w-5 h-5 text-red-400" /> Supreme Sect Master Authority
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link href="/admin" data-testid="link-admin-panel">
                  <Card className="border-red-500/30 bg-red-900/20 hover:bg-red-900/30 cursor-pointer transition-all h-full">
                    <CardContent className="p-4">
                      <Settings className="w-5 h-5 text-red-400 mb-2" />
                      <p className="text-white font-semibold text-sm">Full Admin Panel</p>
                      <p className="text-slate-400 text-xs">Complete control</p>
                    </CardContent>
                  </Card>
                </Link>

                <Card className="border-red-500/30 bg-red-900/20">
                  <CardContent className="p-4">
                    <Users className="w-5 h-5 text-red-400 mb-2" />
                    <p className="text-white font-semibold text-sm">Member Management</p>
                    <p className="text-slate-400 text-xs">142 active disciples</p>
                  </CardContent>
                </Card>

                <Card className="border-red-500/30 bg-red-900/20">
                  <CardContent className="p-4">
                    <Award className="w-5 h-5 text-red-400 mb-2" />
                    <p className="text-white font-semibold text-sm">Rank Management</p>
                    <p className="text-slate-400 text-xs">Promote/demote members</p>
                  </CardContent>
                </Card>

                <Card className="border-red-500/30 bg-red-900/20">
                  <CardContent className="p-4">
                    <TrendingUp className="w-5 h-5 text-red-400 mb-2" />
                    <p className="text-white font-semibold text-sm">Server Stats</p>
                    <p className="text-slate-400 text-xs">Activity & analytics</p>
                  </CardContent>
                </Card>

                <Card className="border-red-500/30 bg-red-900/20">
                  <CardContent className="p-4">
                    <Gem className="w-5 h-5 text-red-400 mb-2" />
                    <p className="text-white font-semibold text-sm">Treasury Control</p>
                    <p className="text-slate-400 text-xs">Global sect treasury</p>
                  </CardContent>
                </Card>

                <Card className="border-red-500/30 bg-red-900/20">
                  <CardContent className="p-4">
                    <AlertCircle className="w-5 h-5 text-red-400 mb-2" />
                    <p className="text-white font-semibold text-sm">Emergency Controls</p>
                    <p className="text-slate-400 text-xs">System-wide actions</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* RANK GUIDE */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Unlock className="w-5 h-5 text-slate-400" /> Rank Permissions Guide
          </h3>
          <div className="space-y-2">
            {rankProgression.map((rank) => {
              const info = rankHierarchy[rank as keyof typeof rankHierarchy];
              const isCurrentRank = rank === userRank;
              return (
                <div
                  key={rank}
                  className={`p-3 rounded-lg border transition-all ${
                    isCurrentRank
                      ? "bg-gradient-to-r from-purple-500/20 to-purple-600/10 border-purple-500/50"
                      : "bg-slate-900/50 border-slate-700/50"
                  }`}
                  data-testid={`rank-guide-${rank.toLowerCase()}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isCurrentRank && <Badge className="bg-purple-500">Current</Badge>}
                      <div>
                        <p className={`font-semibold text-sm ${isCurrentRank ? "text-white" : "text-slate-300"}`}>
                          {rank}
                        </p>
                        <p className="text-xs text-slate-400">{info.permissions.length > 0 ? info.permissions.join(", ") : "Basic access"}</p>
                      </div>
                    </div>
                    <span className="text-slate-400 text-xs">{info.multiplier}x VC</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
