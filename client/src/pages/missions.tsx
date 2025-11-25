import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Scroll } from "lucide-react";

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
  name: string;
  type: string;
  status: string;
  progress?: number;
}

export default function MissionsPage() {
  const [, setLocation] = useLocation();
  const [sessionToken, setSessionToken] = useState<string | null>(null);

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

  const { data: missions = [] } = useQuery<Mission[]>({
    queryKey: [`/api/missions`, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/missions?userId=${user.id}`);
      return res.ok ? res.json() : [];
    },
    enabled: !!user?.id,
  });

  const handleLogout = () => {
    sessionStorage.removeItem("auth_session");
    setLocation("/login");
  };

  if (!user) return <div className="p-8">Loading...</div>;

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Scroll className="w-6 h-6" />
          <h1 className="text-3xl font-bold">Missions</h1>
        </div>

        {missions.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Active Missions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No missions available at the moment.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {missions.map((mission) => (
              <Card key={mission.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{mission.name}</CardTitle>
                    <Badge variant="outline">{mission.type}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Status: {mission.status}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}