import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sword, Users, Zap, Crown, TrendingUp, Award, Flame, Gem } from "lucide-react";
import { Link } from "wouter";

const MOCK_USER = {
  discordId: "123456789",
  serverId: "987654321"
};

export default function Dashboard() {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: [`/api/user/${MOCK_USER.discordId}/${MOCK_USER.serverId}`],
    retry: false,
  });

  const { data: serverSettings } = useQuery({
    queryKey: [`/api/server-settings/${MOCK_USER.serverId}`],
    retry: false,
  });

  const { data: activities } = useQuery({
    queryKey: [`/api/activities/${MOCK_USER.serverId}`],
    retry: false,
  });

  const { data: leaderboard } = useQuery({
    queryKey: [`/api/leaderboard/${MOCK_USER.serverId}`],
    retry: false,
  });

  const isSectMaster = serverSettings?.sectMasterId === MOCK_USER.discordId;

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
        <div className="text-center max-w-md">
          <Crown className="w-16 h-16 text-purple-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">Void Paragon</h1>
          <p className="text-slate-400 mb-6">Join a Discord server with the Void Paragon Bot to begin your cultivation journey</p>
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 text-sm text-slate-300">
            Invite the bot to your server to get started
          </div>
        </div>
      </div>
    );
  }

  const realmColors: Record<string, string> = {
    "Connate Realm": "from-slate-400 to-slate-500",
    "Spirit Realm": "from-blue-400 to-blue-600",
    "Deity Realm": "from-purple-400 to-purple-600",
    "Dao Realm": "from-indigo-400 to-indigo-600",
    "True Spirit Realm": "from-cyan-400 to-cyan-600",
    "Immortal Ascension Realm": "from-yellow-400 to-yellow-600",
    "True God Realm": "from-red-400 to-red-600",
  };

  const gradientClass = realmColors[user.realm] || "from-purple-400 to-purple-600";
  const nextLevelXp = Math.floor(user.level * 100 * (1.5 ** user.level));
  const xpProgress = Math.min((user.xp / nextLevelXp) * 100, 100);

  const recentActivityItems = [
    {
      id: 1,
      icon: Sword,
      title: "Victory in Battle",
      description: "Defeated Shadow Master in PvP",
      time: "2 minutes ago",
      color: "text-green-400",
    },
    {
      id: 2,
      icon: TrendingUp,
      title: "Level Up",
      description: "Reached Level 42",
      time: "1 hour ago",
      color: "text-yellow-400",
    },
    {
      id: 3,
      icon: Gem,
      title: "Item Acquired",
      description: "Obtained Celestial Sword",
      time: "3 hours ago",
      color: "text-purple-400",
    },
    {
      id: 4,
      icon: Crown,
      title: "Rank Achievement",
      description: "Promoted to Core Disciple",
      time: "1 day ago",
      color: "text-blue-400",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header Section */}
      <div className="border-b border-purple-900/50 bg-gradient-to-r from-slate-950/80 to-purple-900/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Void Paragon Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
              {user.rank}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Card - User Profile */}
        <div className="mb-8 relative">
          <div className={`absolute inset-0 bg-gradient-to-r ${gradientClass} rounded-xl opacity-20 blur-xl`} />
          <Card className="relative border-purple-500/30 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
            <CardContent className="p-8">
              <div className="relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left - User Info */}
                  <div>
                    <div className="mb-6">
                      <h2 className="text-4xl font-bold text-white mb-2">{user.username}</h2>
                      <p className={`text-lg bg-gradient-to-r ${gradientClass} bg-clip-text text-transparent font-semibold`}>
                        {user.realm}
                      </p>
                      <p className="text-slate-400 text-sm">Level {user.level}</p>
                    </div>

                    {/* XP Progress */}
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Cultivation Progress</span>
                        <span className="text-purple-300 font-mono">
                          {user.xp.toLocaleString()} / {nextLevelXp.toLocaleString()}
                        </span>
                      </div>
                      <Progress value={xpProgress} className="h-2" />
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
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

                  {/* Right - Currencies & Info */}
                  <div className="space-y-4">
                    {/* Currency Cards */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-slate-400 text-sm">Void Crystals</p>
                            <p className="text-2xl font-bold text-purple-300">{user.voidCrystals}</p>
                          </div>
                          <Gem className="w-8 h-8 text-purple-400" />
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-slate-400 text-sm">Sect Points</p>
                            <p className="text-2xl font-bold text-blue-300">{user.sectPoints || 0}</p>
                          </div>
                          <Crown className="w-8 h-8 text-blue-400" />
                        </div>
                      </div>
                    </div>

                    {/* Faction/Clan Info */}
                    {(user.factionId || user.clanId) && (
                      <div className="space-y-2">
                        {user.factionId && (
                          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                            <p className="text-slate-400 text-xs mb-1">Faction</p>
                            <p className="text-white font-semibold">{user.factionName || "Unknown Faction"}</p>
                          </div>
                        )}
                        {user.clanId && (
                          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                            <p className="text-slate-400 text-xs mb-1">Clan</p>
                            <p className="text-white font-semibold">{user.clanName || "Unknown Clan"}</p>
                            <p className="text-slate-400 text-xs">{user.clanRole}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick Stats */}
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-slate-400 text-xs">Wins</p>
                          <p className="text-lg font-bold text-green-400">{user.battleWins || 0}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Losses</p>
                          <p className="text-lg font-bold text-red-400">{user.battleLosses || 0}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Rank</p>
                          <p className="text-lg font-bold text-purple-400">#{user.rank}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Grid */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/missions" data-testid="link-missions">
              <Card className="border-slate-700/50 bg-slate-900/50 hover:bg-slate-900/70 cursor-pointer transition-all duration-200 hover:border-purple-500/50 group">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-lg group-hover:from-purple-500/30 group-hover:to-purple-600/20 transition-all">
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
              <Card className="border-slate-700/50 bg-slate-900/50 hover:bg-slate-900/70 cursor-pointer transition-all duration-200 hover:border-purple-500/50 group">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-lg group-hover:from-blue-500/30 group-hover:to-blue-600/20 transition-all">
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

            <Link href="/profile" data-testid="link-profile">
              <Card className="border-slate-700/50 bg-slate-900/50 hover:bg-slate-900/70 cursor-pointer transition-all duration-200 hover:border-purple-500/50 group">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 rounded-lg group-hover:from-yellow-500/30 group-hover:to-yellow-600/20 transition-all">
                      <Crown className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">Profile</p>
                      <p className="text-slate-400 text-xs">Your stats</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {isSectMaster && (
              <Link href="/admin" data-testid="link-admin">
                <Card className="border-slate-700/50 bg-slate-900/50 hover:bg-slate-900/70 cursor-pointer transition-all duration-200 hover:border-red-500/50 group">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-lg group-hover:from-red-500/30 group-hover:to-red-600/20 transition-all">
                        <Sword className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">Admin</p>
                        <p className="text-slate-400 text-xs">Management</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </div>

        {/* Two Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Recent Activity
            </h3>
            <Card className="border-slate-700/50 bg-slate-900/50">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {recentActivityItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.id} className="flex items-start gap-4 pb-4 border-b border-slate-700/30 last:pb-0 last:border-0">
                        <div className={`p-2 rounded-lg bg-slate-800/50 ${item.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm">{item.title}</p>
                          <p className="text-slate-400 text-sm truncate">{item.description}</p>
                          <p className="text-slate-500 text-xs mt-1">{item.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard Preview */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-400" />
              Top Cultivators
            </h3>
            <Card className="border-slate-700/50 bg-slate-900/50">
              <CardContent className="p-6">
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((rank) => (
                    <div key={rank} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          rank === 1 ? 'bg-yellow-500/30 text-yellow-300' :
                          rank === 2 ? 'bg-slate-400/30 text-slate-200' :
                          rank === 3 ? 'bg-orange-500/30 text-orange-300' :
                          'bg-purple-500/30 text-purple-300'
                        }`}>
                          {rank}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-white font-semibold text-sm truncate">Player {rank}</p>
                          <p className="text-slate-400 text-xs">Level 50</p>
                        </div>
                      </div>
                      <p className="text-purple-300 font-semibold text-sm ml-2">⭐</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats Overview */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Server Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-slate-700/50 bg-slate-900/50">
              <CardContent className="p-4">
                <p className="text-slate-400 text-xs mb-2">Active Players</p>
                <p className="text-2xl font-bold text-purple-400">142</p>
              </CardContent>
            </Card>
            <Card className="border-slate-700/50 bg-slate-900/50">
              <CardContent className="p-4">
                <p className="text-slate-400 text-xs mb-2">Factions</p>
                <p className="text-2xl font-bold text-blue-400">3</p>
              </CardContent>
            </Card>
            <Card className="border-slate-700/50 bg-slate-900/50">
              <CardContent className="p-4">
                <p className="text-slate-400 text-xs mb-2">Clans</p>
                <p className="text-2xl font-bold text-green-400">8</p>
              </CardContent>
            </Card>
            <Card className="border-slate-700/50 bg-slate-900/50">
              <CardContent className="p-4">
                <p className="text-slate-400 text-xs mb-2">Total Battles</p>
                <p className="text-2xl font-bold text-yellow-400">892</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
