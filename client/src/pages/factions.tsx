import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  rank: string;
  realm: string;
  level: number;
  voidCrystals: number;
  factionId?: number;
}

interface Faction {
  id: number;
  name: string;
  description?: string;
  leaderId: number;
  xp: number;
  voidCrystals: number;
  memberCount: number;
  ranking: number;
}

interface FactionDetails extends Faction {
  members: User[];
}

export default function FactionsPage() {
  const [, setLocation] = useLocation();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [factionName, setFactionName] = useState("");
  const [selectedFaction, setSelectedFaction] = useState<FactionDetails | null>(null);
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

  const { data: factions = [] } = useQuery<Faction[]>({
    queryKey: [`/api/factions`],
    queryFn: async () => {
      const res = await fetch(`/api/factions`);
      return res.ok ? res.json() : [];
    },
  });

  const handleCreateFaction = async () => {
    if (!user || !factionName || user.rank !== "Inheritor Disciple") {
      toast({ title: "❌ Cannot create", description: "Only Inheritor Disciples can create factions", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`/api/factions/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: factionName, leaderId: user.id }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "✅ Faction created!", description: data.message });
        setFactionName("");
        queryClient.invalidateQueries({ queryKey: [`/api/factions`] });
      } else {
        toast({ title: "❌ Failed", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "❌ Error", description: "Failed to create faction", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("auth_session");
    setLocation("/login");
  };

  if (!user) return <div className="p-8">Loading...</div>;

  const userFaction = factions.find(f => f.leaderId === user.id);

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6" />
          <h1 className="text-3xl font-bold">Factions</h1>
        </div>

        {user.rank === "Inheritor Disciple" && !userFaction && (
          <Card>
            <CardHeader>
              <CardTitle>Create a Faction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Faction name"
                value={factionName}
                onChange={(e) => setFactionName(e.target.value)}
                data-testid="input-faction-name"
              />
              <Button onClick={handleCreateFaction} disabled={creating} className="w-full" data-testid="button-create-faction">
                {creating ? "Creating..." : "Create Faction"}
              </Button>
            </CardContent>
          </Card>
        )}

        {userFaction && (
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="text-2xl">{userFaction.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-background rounded">
                  <p className="text-xs text-muted-foreground">Faction XP</p>
                  <p className="text-2xl font-bold">{userFaction.xp}</p>
                </div>
                <div className="p-3 bg-background rounded">
                  <p className="text-xs text-muted-foreground">Treasury</p>
                  <p className="text-2xl font-bold">{userFaction.voidCrystals}</p>
                </div>
                <div className="p-3 bg-background rounded">
                  <p className="text-xs text-muted-foreground">Members</p>
                  <p className="text-2xl font-bold">{userFaction.memberCount}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Rank #{userFaction.ranking} among factions</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-bold">All Factions</h2>
          {factions.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">No factions yet. Be the first to create one!</p>
              </CardContent>
            </Card>
          ) : (
            factions.map((faction) => (
              <Card key={faction.id} className={`hover-elevate cursor-pointer ${userFaction?.id === faction.id ? "border-2 border-primary" : ""}`}>
                <CardHeader>
                  <CardTitle>{faction.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><span className="text-muted-foreground">XP:</span> {faction.xp}</p>
                    <p><span className="text-muted-foreground">Members:</span> {faction.memberCount}</p>
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
