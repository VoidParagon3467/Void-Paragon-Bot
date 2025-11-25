import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { realmLevels, rankHierarchy } from "@shared/schema";

interface User {
  id: number;
  username: string;
  avatar?: string;
  rank: string;
  realm: string;
  level: number;
  xp: number;
  voidCrystals: number;
  sectPoints: number;
  karma: number;
  fate: number;
  factionId?: number;
  factionName?: string;
  clanId?: number;
  clanName?: string;
  isSupremeSectMaster?: boolean;
}

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("auth_session");
    console.log("[ProfilePage] useEffect - token:", token?.substring(0, 10));
    if (!token) {
      console.log("[ProfilePage] NO TOKEN - redirecting to login");
      setLocation("/login");
    }
    else {
      console.log("[ProfilePage] TOKEN FOUND - setting sessionToken");
      setSessionToken(token);
    }
  }, []);

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: [`/api/auth/me`, sessionToken],
    queryFn: async () => {
      if (!sessionToken) return null;
      const res = await fetch(`/api/auth/me?session=${sessionToken}`);
      if (!res.ok) {
        setLocation("/login");
        return null;
      }
      return res.json();
    },
    retry: false,
    enabled: !!sessionToken,
  });

  if (!user || isLoading) return <div className="p-8">Loading...</div>;

  const currentRealm = (realmLevels as any)[user.realm] || 0;
  const maxLevel = currentRealm === 0 ? 1 : currentRealm;
  const levelProgress = maxLevel > 0 ? (user.level / maxLevel) * 100 : 0;
  const nextLevelXp = Math.floor((user.level || 1) * 100 * (1.5 ** (user.level || 1)));
  const xpProgress = Math.min(((user.xp || 0) / nextLevelXp) * 100, 100);

  const handleLogout = () => {
    sessionStorage.removeItem("auth_session");
    setLocation("/login");
  };

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <div className="p-6 space-y-6">
        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Realm</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user.realm}</div>
              <p className="text-xs text-muted-foreground">Level {user.level}/{maxLevel}</p>
              <Progress value={levelProgress} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">XP Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user.xp}</div>
              <p className="text-xs text-muted-foreground">/ {nextLevelXp}</p>
              <Progress value={xpProgress} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Void Crystals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{user.voidCrystals}</div>
              <p className="text-xs text-muted-foreground">Sect Currency</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sect Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{user.sectPoints}</div>
              <p className="text-xs text-muted-foreground">SP</p>
            </CardContent>
          </Card>
        </div>

        {/* Resources */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Karma</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400">{user.karma}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Fate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-pink-400">{user.fate}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Rank</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="default">{user.rank}</Badge>
              {rankHierarchy[user.rank as keyof typeof rankHierarchy] && (
                <p className="text-xs text-muted-foreground mt-2">
                  {rankHierarchy[user.rank as keyof typeof rankHierarchy].multiplier}x VC Multiplier
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Affiliations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {user.factionName && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Faction</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">{user.factionName}</p>
              </CardContent>
            </Card>
          )}

          {user.clanName && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Clan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">{user.clanName}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}