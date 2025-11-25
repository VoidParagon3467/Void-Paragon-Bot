import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Scroll } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  rank: string;
  realm: string;
  level: number;
  voidCrystals: number;
}

interface Mission {
  id: number;
  title: string;
  description: string;
  type: string;
  minRank?: string;
  xpReward: number;
  crystalReward: number;
  spReward: number;
}

interface UserMission {
  id: number;
  missionId: number;
  mission: Mission;
  status: string;
  progress: any;
  assignedAt: string;
}

export default function MissionsPage() {
  const [, setLocation] = useLocation();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [completing, setCompleting] = useState<number | null>(null);
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

  const { data: userMissions = [] } = useQuery<UserMission[]>({
    queryKey: [`/api/missions`, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/user-missions?userId=${user.id}`);
      return res.ok ? res.json() : [];
    },
    enabled: !!user?.id,
  });

  const handleCompleteMission = async (missionId: number) => {
    if (!user?.id) return;
    setCompleting(missionId);
    try {
      const res = await fetch(`/api/missions/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, missionId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "✅ Mission completed!", description: data.message });
        queryClient.invalidateQueries({ queryKey: [`/api/missions`, user.id] });
        queryClient.invalidateQueries({ queryKey: [`/api/auth/me`] });
      } else {
        toast({ title: "❌ Failed", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "❌ Error", description: "Failed to complete mission", variant: "destructive" });
    } finally {
      setCompleting(null);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("auth_session");
    setLocation("/login");
  };

  if (!user) return <div className="p-8">Loading...</div>;

  const activeMissions = userMissions.filter((um: any) => um.status === "active");
  const completedMissions = userMissions.filter((um: any) => um.status === "completed");

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Scroll className="w-6 h-6" />
          <h1 className="text-3xl font-bold">Missions</h1>
        </div>

        {activeMissions.length === 0 && completedMissions.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Missions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Missions will appear here. Check back later!</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {activeMissions.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Active Missions</h2>
                {activeMissions.map((um: any) => (
                  <Card key={um.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{um.mission.title}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">{um.mission.description}</p>
                        </div>
                        <Badge>{um.mission.type}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Progress value={65} />
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span className="text-muted-foreground">65%</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="p-2 bg-background rounded">
                          <p className="text-muted-foreground">XP</p>
                          <p className="font-bold">+{um.mission.xpReward}</p>
                        </div>
                        <div className="p-2 bg-background rounded">
                          <p className="text-muted-foreground">VC</p>
                          <p className="font-bold">+{um.mission.crystalReward}</p>
                        </div>
                        <div className="p-2 bg-background rounded">
                          <p className="text-muted-foreground">SP</p>
                          <p className="font-bold">+{um.mission.spReward}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleCompleteMission(um.missionId)}
                        disabled={completing === um.missionId}
                        className="w-full"
                        data-testid={`button-complete-mission-${um.missionId}`}
                      >
                        {completing === um.missionId ? "Completing..." : "Complete Mission"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {completedMissions.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Completed</h2>
                {completedMissions.map((um: any) => (
                  <Card key={um.id} className="opacity-50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{um.mission.title}</CardTitle>
                        <Badge variant="outline">✓ Completed</Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
