import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ShoppingCart, Gem } from "lucide-react";

interface User {
  id: number;
  username: string;
  rank: string;
  realm: string;
  level: number;
  voidCrystals: number;
  sectPoints: number;
  karma: number;
}

interface ShopItem {
  id: number;
  name: string;
  type: string;
  rarity: string;
  price: number;
  currency: "vc" | "sp" | "karma";
}

export default function ShopPage() {
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

  const { data: vcItems = [] } = useQuery<ShopItem[]>({
    queryKey: [`/api/shop/vc`],
    queryFn: async () => {
      const res = await fetch(`/api/shop/vc`);
      return res.ok ? res.json() : [];
    },
  });

  const { data: spItems = [] } = useQuery<ShopItem[]>({
    queryKey: [`/api/shop/sp`],
    queryFn: async () => {
      const res = await fetch(`/api/shop/sp`);
      return res.ok ? res.json() : [];
    },
  });

  const { data: karmaItems = [] } = useQuery<ShopItem[]>({
    queryKey: [`/api/shop/karma`],
    queryFn: async () => {
      const res = await fetch(`/api/shop/karma`);
      return res.ok ? res.json() : [];
    },
  });

  const handleLogout = () => {
    sessionStorage.removeItem("auth_session");
    setLocation("/login");
  };

  const handleBuy = async (itemId: number, currency: string) => {
    if (!user?.id) return;
    fetch(`/api/shop/buy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, itemId, currency }),
    }).catch(() => {});
  };

  if (!user) return <div className="p-8">Loading...</div>;

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-6 h-6" />
          <h1 className="text-3xl font-bold">Sect Shop</h1>
        </div>

        <Tabs defaultValue="vc" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="vc" className="flex items-center gap-2">
              <Gem className="w-4 h-4 text-amber-500" />
              <span>VC Shop</span>
              <Badge variant="outline" className="ml-1">{user.voidCrystals}</Badge>
            </TabsTrigger>
            <TabsTrigger value="sp" className="flex items-center gap-2">
              <Gem className="w-4 h-4 text-blue-400" />
              <span>SP Shop</span>
              <Badge variant="outline" className="ml-1">{user.sectPoints}</Badge>
            </TabsTrigger>
            <TabsTrigger value="karma" className="flex items-center gap-2">
              <Gem className="w-4 h-4 text-purple-400" />
              <span>Karma Shop</span>
              <Badge variant="outline" className="ml-1">{user.karma}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vc" className="space-y-4">
            <p className="text-sm text-muted-foreground">Auto-regenerates every few hours with common to rare treasures</p>
            {vcItems.map(item => (
              <Card key={item.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{item.type}</p>
                    </div>
                    <Badge variant="outline">{item.rarity}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <p className="text-lg font-bold text-amber-500">{item.price} VC</p>
                  <Button
                    disabled={user.voidCrystals < item.price}
                    onClick={() => handleBuy(item.id, "vc")}
                    data-testid={`button-buy-vc-${item.id}`}
                    className="active-elevate-2"
                  >
                    Buy
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="sp" className="space-y-4">
            <p className="text-sm text-muted-foreground">Auto-regenerates daily with rare items, weapons, and bloodlines</p>
            {spItems.map(item => (
              <Card key={item.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{item.type}</p>
                    </div>
                    <Badge variant="outline">{item.rarity}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <p className="text-lg font-bold text-blue-400">{item.price} SP</p>
                  <Button
                    disabled={user.sectPoints < item.price}
                    onClick={() => handleBuy(item.id, "sp")}
                    data-testid={`button-buy-sp-${item.id}`}
                    className="active-elevate-2"
                  >
                    Buy
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="karma" className="space-y-4">
            <p className="text-sm text-muted-foreground">Auto-regenerates randomly with legendary god-tier objects</p>
            {karmaItems.map(item => (
              <Card key={item.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{item.type}</p>
                    </div>
                    <Badge variant="outline">{item.rarity}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <p className="text-lg font-bold text-purple-400">{item.price} Karma</p>
                  <Button
                    disabled={user.karma < item.price}
                    onClick={() => handleBuy(item.id, "karma")}
                    data-testid={`button-buy-karma-${item.id}`}
                    className="active-elevate-2"
                  >
                    Buy
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
