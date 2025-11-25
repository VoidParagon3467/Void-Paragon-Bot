import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Backpack, Sword, ScrollText, Sparkles, Gem } from "lucide-react";

interface User {
  id: number;
  username: string;
  rank: string;
  realm: string;
  level: number;
  voidCrystals: number;
}

interface Item {
  id: number;
  name: string;
  type: string;
  rarity: string;
  quantity?: number;
}

export default function InventoryPage() {
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

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: [`/api/inventory`, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/inventory?userId=${user.id}`);
      return res.ok ? res.json() : [];
    },
    enabled: !!user?.id,
  });

  const handleLogout = () => {
    sessionStorage.removeItem("auth_session");
    setLocation("/login");
  };

  if (!user) return <div className="p-8">Loading...</div>;

  const weapons = items.filter(i => i.type === 'weapon');
  const skills = items.filter(i => i.type === 'skill');
  const bloodlines = items.filter(i => i.type === 'bloodline');
  const divineBodies = items.filter(i => i.type === 'divine_body');
  const treasures = items.filter(i => i.type === 'treasure');

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Backpack className="w-6 h-6" />
          <h1 className="text-3xl font-bold">Inventory</h1>
        </div>

        <Tabs defaultValue="weapons" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="weapons" className="flex items-center gap-2">
              <Sword className="w-4 h-4" />
              <span className="hidden sm:inline">Weapons</span>
            </TabsTrigger>
            <TabsTrigger value="skills" className="flex items-center gap-2">
              <ScrollText className="w-4 h-4" />
              <span className="hidden sm:inline">Skills</span>
            </TabsTrigger>
            <TabsTrigger value="bloodlines" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Bloodlines</span>
            </TabsTrigger>
            <TabsTrigger value="divine" className="flex items-center gap-2">
              <Gem className="w-4 h-4" />
              <span className="hidden sm:inline">Divine</span>
            </TabsTrigger>
            <TabsTrigger value="treasures" className="flex items-center gap-2">
              <Gem className="w-4 h-4" />
              <span className="hidden sm:inline">Treasures</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weapons" className="space-y-4">
            {weapons.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">No weapons in inventory</p>
                </CardContent>
              </Card>
            ) : (
              weapons.map(item => (
                <Card key={item.id}>
                  <CardHeader>
                    <CardTitle>{item.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Rarity: {item.rarity}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="skills" className="space-y-4">
            {skills.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">No skills in inventory</p>
                </CardContent>
              </Card>
            ) : (
              skills.map(item => (
                <Card key={item.id}>
                  <CardHeader>
                    <CardTitle>{item.name}</CardTitle>
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="bloodlines" className="space-y-4">
            {bloodlines.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">No bloodlines in inventory</p>
                </CardContent>
              </Card>
            ) : (
              bloodlines.map(item => (
                <Card key={item.id}>
                  <CardHeader>
                    <CardTitle>{item.name}</CardTitle>
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="divine" className="space-y-4">
            {divineBodies.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">No divine bodies in inventory</p>
                </CardContent>
              </Card>
            ) : (
              divineBodies.map(item => (
                <Card key={item.id}>
                  <CardHeader>
                    <CardTitle>{item.name}</CardTitle>
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="treasures" className="space-y-4">
            {treasures.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">No treasures in inventory</p>
                </CardContent>
              </Card>
            ) : (
              treasures.map(item => (
                <Card key={item.id}>
                  <CardHeader>
                    <CardTitle>{item.name}</CardTitle>
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}