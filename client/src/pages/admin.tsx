import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Users, Settings, BookOpen, Zap, Gem, LogOut } from "lucide-react";

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

  useEffect(() => {
    const token = sessionStorage.getItem("auth_session");
    if (!token) setLocation("/login");
    else setSessionToken(token);
  }, [setLocation]);

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

  const handleLogout = () => {
    sessionStorage.removeItem("auth_session");
    setLocation("/login");
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
              <div className="text-3xl font-bold text-amber-500">999,999</div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Sections */}
        <Tabs defaultValue="disciples" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="disciples"><Users className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="events"><Zap className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="resources"><Gem className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="ranks"><Users className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="missions"><BookOpen className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="logs"><LogOut className="w-4 h-4" /></TabsTrigger>
          </TabsList>

          <TabsContent value="disciples">
            <Card>
              <CardHeader>
                <CardTitle>Disciples Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Ban, punish, warn, or expel disciples</p>
                <Button disabled>Manage Disciples</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>Events Control</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Create, configure, and manage sect events</p>
                <Button disabled>Create Event</Button>
                <Button disabled>Configure Events</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources">
            <Card>
              <CardHeader>
                <CardTitle>Resources Control</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Manage sect resources, daily rewards, and allocations</p>
                <Button disabled>Manage Treasury</Button>
                <Button disabled>Set Daily Rewards</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ranks">
            <Card>
              <CardHeader>
                <CardTitle>Ranks Control</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Grant rank, raise realms, raise level for disciples</p>
                <Button disabled>Manage Ranks</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="missions">
            <Card>
              <CardHeader>
                <CardTitle>Missions Control</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Configure missions, set rewards, give missions</p>
                <Button disabled>Create Mission</Button>
                <Button disabled>Configure Missions</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Bot Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Reports of all activity in the sect</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
