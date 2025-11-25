import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Users, Settings, BookOpen, Zap, Gem, LogOut, Shield, Trash2, ArrowUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  rank: string;
  realm: string;
  level: number;
  isSupremeSectMaster?: boolean;
}

interface ServerStats {
  totalUsers?: number;
  totalDisciples?: number;
  totalElders?: number;
  activeMissions?: number;
}

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
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

  const { data: stats = {} } = useQuery<ServerStats>({
    queryKey: [`/api/admin/stats`, user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      const res = await fetch(`/api/admin/stats`);
      return res.ok ? res.json() : {};
    },
    enabled: !!user?.id && user?.isSupremeSectMaster,
  });

  const { data: disciples = [] } = useQuery<User[]>({
    queryKey: [`/api/admin/disciples`],
    queryFn: async () => {
      const res = await fetch(`/api/admin/disciples`);
      return res.ok ? res.json() : [];
    },
    enabled: !!user?.isSupremeSectMaster,
  });

  const handleLogout = () => {
    sessionStorage.removeItem("auth_session");
    setLocation("/login");
  };

  const handleDisciplineAction = async (discipleId: number, action: "warn" | "ban" | "unban", reason?: string) => {
    setActionInProgress(`${action}-${discipleId}`);
    try {
      const res = await fetch(`/api/admin/discipline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: discipleId, action, reason: reason || "" }),
      });
      
      if (res.ok) {
        toast({ title: `✅ ${action.toUpperCase()}`, description: `Disciple has been ${action}ed` });
        queryClient.invalidateQueries({ queryKey: [`/api/admin/disciples`] });
      } else {
        toast({ title: "❌ Failed", description: "Could not perform action", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "❌ Error", description: "Action failed", variant: "destructive" });
    } finally {
      setActionInProgress(null);
    }
  };

  const handlePromoteRank = async (discipleId: number) => {
    setActionInProgress(`promote-${discipleId}`);
    try {
      const res = await fetch(`/api/admin/promote-rank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: discipleId }),
      });
      
      if (res.ok) {
        toast({ title: "✅ Promoted", description: "Disciple promoted to next rank" });
        queryClient.invalidateQueries({ queryKey: [`/api/admin/disciples`] });
      } else {
        toast({ title: "❌ Failed", description: "Cannot promote further", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "❌ Error", description: "Promotion failed", variant: "destructive" });
    } finally {
      setActionInProgress(null);
    }
  };

  if (!user || !user.isSupremeSectMaster) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">Only Supreme Sect Master can access this panel.</p>
          <Button onClick={() => setLocation("/")} data-testid="button-back-to-dashboard">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6" />
          <h1 className="text-3xl font-bold">Sect Master Control Panel</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Disciples</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalUsers || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Active Missions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.activeMissions || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Elders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalElders || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total VC in Sect</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-500">Calculating...</div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Controls */}
        <Tabs defaultValue="disciples" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="disciples"><Users className="w-4 h-4 mr-2" />Disciples</TabsTrigger>
            <TabsTrigger value="logs"><LogOut className="w-4 h-4 mr-2" />Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="disciples">
            <Card>
              <CardHeader>
                <CardTitle>Disciples Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {disciples.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No disciples yet</p>
                  ) : (
                    disciples.map(disciple => (
                      <div key={disciple.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                        <div>
                          <p className="font-bold text-sm">{disciple.username}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{disciple.rank}</Badge>
                            <Badge variant="secondary" className="text-xs">{disciple.realm} Lvl {disciple.level}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePromoteRank(disciple.id)}
                            disabled={actionInProgress === `promote-${disciple.id}`}
                            data-testid={`button-promote-${disciple.id}`}
                            title="Promote rank"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDisciplineAction(disciple.id, "warn")}
                            disabled={actionInProgress === `warn-${disciple.id}`}
                            data-testid={`button-warn-${disciple.id}`}
                            title="Warn"
                          >
                            <Shield className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDisciplineAction(disciple.id, "ban")}
                            disabled={actionInProgress === `ban-${disciple.id}`}
                            data-testid={`button-ban-${disciple.id}`}
                            title="Ban"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">Activity logging coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
