import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Gift, Check } from "lucide-react";

interface User {
  id: number;
  username: string;
  rank: string;
  realm: string;
  level: number;
  isPremium?: boolean;
}

const RANK_BENEFITS: Record<string, string[]> = {
  "Outer Disciple": ["Basic inventory (3 slots)", "Access to VC Shop", "Daily login bonus"],
  "Inner Disciple": ["Expanded inventory (5 slots)", "Access to SP Shop", "Weekly rewards"],
  "Core Disciple": ["Large inventory (7 slots)", "Rare item drops", "Monthly events"],
  "Inheritor Disciple": ["Premium inventory (10 slots)", "Faction creation", "Priority in battles"],
  "Guardians": ["VIP inventory (15 slots)", "Moderation tools", "Guild bonuses"],
  "Elder": ["Vast inventory (20 slots)", "Treasury access", "Event creation"],
  "Great Elder": ["Legendary inventory (30 slots)", "Clan creation", "Custom titles"],
  "Heavenly Elder": ["Infinite inventory (50 slots)", "All permissions", "Special rewards"],
  "Supreme Sect Master": ["Unlimited everything", "Full admin control", "Event god mode"],
};

export default function PremiumPage() {
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

  const handleLogout = () => {
    sessionStorage.removeItem("auth_session");
    setLocation("/login");
  };

  if (!user) return <div className="p-8">Loading...</div>;

  const userBenefits = RANK_BENEFITS[user.rank] || RANK_BENEFITS["Outer Disciple"];

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Gift className="w-6 h-6" />
          <h1 className="text-3xl font-bold">Benefits & Perks</h1>
        </div>

        {/* Current Rank Benefits */}
        <Card className="border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Your Rank: {user.rank}</CardTitle>
              <Badge className="text-lg py-1 px-3">{user.realm} Lvl {user.level}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3">Current benefits unlocked:</p>
              <ul className="space-y-2">
                {userBenefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* How to Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rise in Rank</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="font-bold mb-2">To advance your rank:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Gain XP through missions and activities</li>
                <li>• Participate in events and spars</li>
                <li>• Earn Sect Points and complete challenges</li>
                <li>• Seek promotion from Elders or the Supreme Sect Master</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* All Rank Tiers */}
        <div>
          <h2 className="text-xl font-bold mb-4">All Rank Tiers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(RANK_BENEFITS).map(([rank, benefits]) => (
              <Card 
                key={rank}
                className={rank === user.rank ? "border-amber-500 border-2 bg-amber-500/5" : ""}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    {rank}
                    {rank === user.rank && <Badge>Current</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <Check className="w-3 h-3 mt-0.5 flex-shrink-0 text-green-500" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
