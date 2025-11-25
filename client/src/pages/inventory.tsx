import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Backpack, Sword, ScrollText, Sparkles, Gem, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  effect?: string;
}

const inventoryLimits: Record<string, number> = {
  "Outer Disciple": 3,
  "Inner Disciple": 5,
  "Core Disciple": 7,
  "Inheritor Disciple": 10,
  "Guardians": 15,
  "Elder": 20,
  "Great Elder": 30,
  "Heavenly Elder": 50,
  "Supreme Sect Master": 999999,
};

export default function InventoryPage() {
  const [, setLocation] = useLocation();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const token = sessionStorage.getItem("auth_session");
    if (!token) setLocation("/login");
    else setSessionToken(token);
  }, []);

  const { data: user, refetch: refetchUser } = useQuery<User | null>({
    queryKey: [`/api/auth/me`, sessionToken],
    queryFn: async () => {
      if (!sessionToken) return null;
      const res = await fetch(`/api/auth/me?session=${sessionToken}`);
      return res.ok ? res.json() : null;
    },
    enabled: !!sessionToken,
  });

  const { data: items = [], refetch: refetchItems } = useQuery<Item[]>({
    queryKey: [`/api/inventory`, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/inventory?userId=${user.id}`);
      return res.ok ? res.json() : [];
    },
    enabled: !!user?.id,
  });

  const useItemMutation = useMutation({
    mutationFn: async ({ itemId, itemType }: { itemId: number; itemType: string }) => {
      const res = await fetch(`/api/inventory/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, itemId, itemType }),
      });
      if (!res.ok) throw new Error("Failed to use item");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: data.message,
      });
      setTimeout(() => {
        refetchItems();
        refetchUser();
      }, 100);
    },
  });

  const handleLogout = () => {
    sessionStorage.removeItem("auth_session");
    setLocation("/login");
  };

  const handleUseItem = (itemId: number, itemType: string) => {
    useItemMutation.mutate({ itemId, itemType });
  };

  if (!user) return <div className="p-8">Loading...</div>;

  const inventoryLimit = inventoryLimits[user.rank] || 3;
  const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const weapons = items.filter(i => i.type === 'weapon');
  const pills = items.filter(i => i.type === 'pill');
  const treasures = items.filter(i => i.type === 'treasure');
  const bloodlines = items.filter(i => i.type === 'bloodline');
  const skills = items.filter(i => i.type === 'skill');

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Backpack className="w-6 h-6" />
            <h1 className="text-3xl font-bold">Inventory</h1>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Items</p>
            <p className="text-2xl font-bold">{totalItems} / {inventoryLimit}</p>
          </div>
        </div>

        {totalItems >= inventoryLimit && (
          <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4">
            <p className="text-yellow-200">⚠️ Inventory Full! You cannot carry more items.</p>
          </div>
        )}

        <Tabs defaultValue="weapons" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="weapons" className="flex items-center gap-1">
              <Sword className="w-4 h-4" />
              <span className="hidden sm:inline">Weapons</span>
            </TabsTrigger>
            <TabsTrigger value="pills" className="flex items-center gap-1">
              <Gem className="w-4 h-4" />
              <span className="hidden sm:inline">Pills</span>
            </TabsTrigger>
            <TabsTrigger value="treasures" className="flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Treasures</span>
            </TabsTrigger>
            <TabsTrigger value="bloodlines" className="flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Bloodlines</span>
            </TabsTrigger>
            <TabsTrigger value="skills" className="flex items-center gap-1">
              <ScrollText className="w-4 h-4" />
              <span className="hidden sm:inline">Skills</span>
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
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <Badge variant="outline">{item.rarity}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Quantity: {item.quantity || 1}</p>
                    <Button
                      size="sm"
                      onClick={() => handleUseItem(item.id, 'weapon')}
                      data-testid={`button-equip-${item.id}`}
                      className="active-elevate-2"
                    >
                      Equip
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="pills" className="space-y-4">
            {pills.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">No pills in inventory</p>
                </CardContent>
              </Card>
            ) : (
              pills.map(item => (
                <Card key={item.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        {item.effect && <p className="text-xs text-amber-400 mt-1">{item.effect}</p>}
                      </div>
                      <Badge variant="outline">{item.rarity}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Quantity: {item.quantity || 1}</p>
                    <Button
                      size="sm"
                      onClick={() => handleUseItem(item.id, 'pill')}
                      data-testid={`button-use-pill-${item.id}`}
                      className="active-elevate-2"
                    >
                      Use
                    </Button>
                  </CardContent>
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
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <Badge variant="outline">{item.rarity}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Quantity: {item.quantity || 1}</p>
                    <Button
                      size="sm"
                      onClick={() => handleUseItem(item.id, 'treasure')}
                      data-testid={`button-use-treasure-${item.id}`}
                      className="active-elevate-2"
                    >
                      Use
                    </Button>
                  </CardContent>
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
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <Badge variant="outline">{item.rarity}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Quantity: {item.quantity || 1}</p>
                    <Button
                      size="sm"
                      onClick={() => handleUseItem(item.id, 'bloodline')}
                      data-testid={`button-activate-bloodline-${item.id}`}
                      className="active-elevate-2"
                    >
                      Activate
                    </Button>
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
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <Badge variant="outline">{item.rarity}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Quantity: {item.quantity || 1}</p>
                    <Button
                      size="sm"
                      onClick={() => handleUseItem(item.id, 'skill')}
                      data-testid={`button-learn-skill-${item.id}`}
                      className="active-elevate-2"
                    >
                      Learn
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
