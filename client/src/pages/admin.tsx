import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useState, useEffect } from "react";

export default function Admin() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("auth_session");
    if (stored) setSessionToken(stored);
  }, []);

  const { data: user, isLoading: userLoading } = useQuery({
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

  const { data: serverSettings = {}, isLoading: settingsLoading } = useQuery({
    queryKey: [`/api/server-settings/${user?.serverId}`],
    enabled: !!user?.serverId,
  });

  const { data: stats = {} } = useQuery({
    queryKey: [`/api/stats/${user?.serverId}`],
    enabled: !!user?.serverId,
  });

  const { data: users = [] } = useQuery({
    queryKey: [`/api/users/${user?.serverId}`],
    enabled: !!user?.serverId,
  });

  if (userLoading || settingsLoading) {
    return (
      <div className="starry-bg min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-center mt-4 text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  const isSectMaster = user?.isSupremeSectMaster || (serverSettings as any)?.sectMasterId === user?.discordId;

  if (!isSectMaster) {
    return (
      <div className="starry-bg min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8 max-w-md mx-4">
          <div className="text-center">
            <i className="fas fa-shield-alt text-4xl text-red-500 mb-4" />
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-muted-foreground mb-6">
              You need Sect Master permissions to access this panel.
            </p>
            <Link href="/">
              <Button>Return to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="starry-bg min-h-screen text-white">
      {/* Navigation */}
      <nav className="glass-card fixed top-0 left-0 right-0 z-50 border-b border-primary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <i className="fas fa-infinity text-primary text-2xl" />
                <span className="font-bold text-xl cultivation-glow font-mono">VOID</span>
              </Link>
              <Badge className="bg-yellow-500 text-black">
                <i className="fas fa-crown mr-1" />
                Sect Master
              </Badge>
            </div>
            <Link href="/">
              <Button variant="outline" size="sm">
                <i className="fas fa-arrow-left mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold cultivation-glow mb-2">
              <i className="fas fa-crown mr-3 text-yellow-500" />
              Sect Master Control Panel
            </h1>
            <p className="text-muted-foreground">Divine powers to manage the cultivation sect</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="glass-card border-primary/30">
              <CardContent className="p-6">
                <div className="text-center">
                  <i className="fas fa-users text-3xl text-primary mb-3" />
                  <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Cultivators</div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-primary/30">
              <CardContent className="p-6">
                <div className="text-center">
                  <i className="fas fa-mountain text-3xl text-purple-400 mb-3" />
                  <div className="text-2xl font-bold">{stats?.totalFactions || 0}</div>
                  <div className="text-sm text-muted-foreground">Active Factions</div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-primary/30">
              <CardContent className="p-6">
                <div className="text-center">
                  <i className="fas fa-sword text-3xl text-red-400 mb-3" />
                  <div className="text-2xl font-bold">{stats?.totalBattles || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Battles</div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-primary/30">
              <CardContent className="p-6">
                <div className="text-center">
                  <i className="fas fa-chart-line text-3xl text-green-400 mb-3" />
                  <div className="text-2xl font-bold">{stats?.averageLevel || 0}</div>
                  <div className="text-sm text-muted-foreground">Average Level</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Divine Powers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="glass-card border-yellow-500/30">
              <CardHeader>
                <CardTitle className="text-yellow-500">
                  <i className="fas fa-magic mr-2" />
                  Divine Powers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black">
                  <i className="fas fa-plus mr-2" />
                  Grant Cultivation Levels
                </Button>
                <Button className="w-full bg-red-500 hover:bg-red-600">
                  <i className="fas fa-ban mr-2" />
                  Banish Cultivator
                </Button>
                <Button className="w-full bg-purple-500 hover:bg-purple-600">
                  <i className="fas fa-star mr-2" />
                  Start Sect Event
                </Button>
                <Button className="w-full bg-blue-500 hover:bg-blue-600">
                  <i className="fas fa-gem mr-2" />
                  Grant Void Crystals
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-card border-primary/30">
              <CardHeader>
                <CardTitle className="text-primary">
                  <i className="fas fa-cog mr-2" />
                  Server Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">XP Multiplier</label>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="range" 
                      min="0.5" 
                      max="3" 
                      step="0.1" 
                      defaultValue={serverSettings?.xpMultiplier || 1}
                      className="flex-1"
                    />
                    <span className="text-sm font-mono">{serverSettings?.xpMultiplier || 1}x</span>
                  </div>
                </div>
                <Button className="w-full" variant="outline">
                  <i className="fas fa-save mr-2" />
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Player Management */}
          <Card className="glass-card border-primary/30">
            <CardHeader>
              <CardTitle>
                <i className="fas fa-users mr-2" />
                Cultivator Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users?.slice(0, 10).map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-4 glass-card rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                        <i className="fas fa-user text-white text-sm" />
                      </div>
                      <div>
                        <div className="font-semibold">{user.username}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.realm} - Level {user.level}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{user.power} Power</Badge>
                      <Button size="sm" variant="outline">
                        <i className="fas fa-cog" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
