import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  rank: string;
  realm: string;
  level: number;
  voidCrystals: number;
  sectPoints: number;
  clanId?: number;
}

interface Clan {
  id: number;
  name: string;
  description?: string;
  chiefId: number;
  xp: number;
  voidCrystals: number;
  memberCount: number;
  prestige: number;
  level: number;
  uniqueBloodlineId?: number;
  specialSkillIds?: any[];
  specialWeaponIds?: any[];
}

export default function ClansPage() {
  const [, setLocation] = useLocation();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [clanName, setClanName] = useState("");
  const [clanRules, setClanRules] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = sessionStorage.getItem("auth_session");
    if (!token) setLocation("/login");
    else setSessionToken(token);
  }, []);

  const { data: user } = useQuery<User | null>({
    queryKey: [`/api/auth/me`, sessionToken],
    queryFn: async () => {
      if (!sessionToken) return null;
      const res = await fetch(`/api/auth/me?session=${sessionToken}`);
      return res.ok ? res.json() : null;
    },
    enabled: !!sessionToken,
  });

  const { data: clans = [] } = useQuery<Clan[]>({
    queryKey: [`/api/clans`],
    queryFn: async () => {
      const res = await fetch(`/api/clans`);
      return res.ok ? res.json() : [];
    },
  });

  const handleCreateClan = async () => {
    if (!user || !clanName || (user.rank !== "Great Elder" && user.rank !== "Heavenly Elder" && user.rank !== "Supreme Sect Master")) {
      toast({ title: "❌ Cannot create", description: "Only Elders and above can create clans", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`/api/clans/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: clanName, chiefId: user.id, rules: clanRules }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "✅ Clan created!", description: data.message });
        setClanName("");
        setClanRules("");
        queryClient.invalidateQueries({ queryKey: [`/api/clans`] });
      } else {
        toast({ title: "❌ Failed", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "❌ Error", description: "Failed to create clan", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("auth_session");
    setLocation("/login");
  };

  if (!user) return <div className="p-8">Loading...</div>;

  const userClan = clans.find(c => c.chiefId === user.id);
  const canCreateClan = ["Great Elder", "Heavenly Elder", "Supreme Sect Master"].includes(user.rank);

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Crown className="w-6 h-6" />
          <h1 className="text-3xl font-bold">Clans</h1>
        </div>

        {canCreateClan && !userClan && (
          <Card>
            <CardHeader>
              <CardTitle>Establish a Clan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Clan name"
                value={clanName}
                onChange={(e) => setClanName(e.target.value)}
                data-testid="input-clan-name"
              />
              <Input
                placeholder="Clan rules (optional)"
                value={clanRules}
                onChange={(e) => setClanRules(e.target.value)}
                data-testid="input-clan-rules"
              />
              <Button onClick={handleCreateClan} disabled={creating} className="w-full" data-testid="button-create-clan">
                {creating ? "Creating..." : "Establish Clan"}
              </Button>
            </CardContent>
          </Card>
        )}

        {userClan && (
          <Card className="border-2 border-amber-500">
            <CardHeader>
              <CardTitle className="text-2xl">{userClan.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{userClan.description}</p>
              <div className="grid grid-cols-4 gap-2">
                <div className="p-2 bg-background rounded text-center">
                  <p className="text-xs text-muted-foreground">Level</p>
                  <p className="text-xl font-bold">{userClan.level}</p>
                </div>
                <div className="p-2 bg-background rounded text-center">
                  <p className="text-xs text-muted-foreground">XP</p>
                  <p className="text-xl font-bold">{userClan.xp}</p>
                </div>
                <div className="p-2 bg-background rounded text-center">
                  <p className="text-xs text-muted-foreground">Prestige</p>
                  <p className="text-xl font-bold">{userClan.prestige}</p>
                </div>
                <div className="p-2 bg-background rounded text-center">
                  <p className="text-xs text-muted-foreground">Members</p>
                  <p className="text-xl font-bold">{userClan.memberCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-bold">All Clans</h2>
          {clans.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">No clans yet. Elders can create the first one!</p>
              </CardContent>
            </Card>
          ) : (
            clans.map((clan) => (
              <Card key={clan.id} className={`hover-elevate cursor-pointer ${userClan?.id === clan.id ? "border-2 border-amber-500" : ""}`}>
                <CardHeader>
                  <CardTitle>{clan.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <p><span className="text-muted-foreground">Lvl:</span> {clan.level}</p>
                    <p><span className="text-muted-foreground">Members:</span> {clan.memberCount}</p>
                    <p><span className="text-muted-foreground">Prestige:</span> {clan.prestige}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
