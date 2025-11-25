import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Swords, Zap, Shield, Zenigata } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  rank: string;
  realm: string;
  level: number;
  power?: number;
  defense?: number;
  agility?: number;
  wisdom?: number;
}

interface BattleResult {
  success: boolean;
  narrative?: string;
  result?: "win" | "lose" | "draw";
  xpGained?: number;
  crystalsGained?: number;
  message?: string;
}

export default function SparPage() {
  const [, setLocation] = useLocation();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [selectedOpponent, setSelectedOpponent] = useState<number | null>(null);
  const [battleInProgress, setBattleInProgress] = useState(false);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const { data: opponents = [] } = useQuery<User[]>({
    queryKey: [`/api/spar/opponents`, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/spar/opponents?userId=${user.id}`);
      return res.ok ? res.json() : [];
    },
    enabled: !!user?.id,
  });

  const handleLogout = () => {
    sessionStorage.removeItem("auth_session");
    setLocation("/login");
  };

  const handleChallenge = async (opponentId: number) => {
    if (!user?.id) return;
    setBattleInProgress(true);
    setBattleResult(null);
    
    try {
      const res = await fetch(`/api/spar/battle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attackerId: user.id, defenderId: opponentId }),
      });
      const data = await res.json() as BattleResult;
      
      if (res.ok) {
        setBattleResult(data);
        toast({ 
          title: data.result === "win" ? "⚔️ Victory!" : data.result === "lose" ? "💔 Defeated" : "🤝 Draw",
          description: `${data.xpGained || 0} XP earned` 
        });
        refetchUser();
        queryClient.invalidateQueries({ queryKey: [`/api/spar/opponents`, user.id] });
      } else {
        toast({ title: "❌ Battle failed", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "❌ Error", description: "Battle request failed", variant: "destructive" });
    } finally {
      setBattleInProgress(false);
    }
  };

  if (!user) return <div className="p-8">Loading...</div>;

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Swords className="w-6 h-6" />
          <h1 className="text-3xl font-bold">Combat Arena</h1>
        </div>

        {/* Battle Result */}
        {battleResult && (
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader>
              <CardTitle className="text-lg">
                {battleResult.result === "win" ? "⚔️ Victory!" : battleResult.result === "lose" ? "💔 Defeated" : "🤝 Draw"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">{battleResult.narrative}</p>
              <div className="flex gap-4 mt-4 text-sm">
                <div>
                  <span className="text-muted-foreground">XP Gained:</span>
                  <p className="text-green-500 font-bold">{battleResult.xpGained || 0}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Crystals:</span>
                  <p className="text-amber-500 font-bold">{battleResult.crystalsGained || 0}</p>
                </div>
              </div>
              <Button 
                size="sm" 
                className="mt-4 w-full"
                onClick={() => { setBattleResult(null); setSelectedOpponent(null); }}
                data-testid="button-battle-again"
              >
                Find Another Opponent
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Your Stats */}
        {!battleResult && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Your Combat Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1"><Zap className="w-3 h-3" />Power</span>
                    <p className="font-bold">{user.power || user.level * 10}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1"><Shield className="w-3 h-3" />Defense</span>
                    <p className="font-bold">{user.defense || user.level * 8}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1"><Zenigata className="w-3 h-3" />Agility</span>
                    <p className="font-bold">{user.agility || user.level * 7}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Wisdom</span>
                    <p className="font-bold">{user.wisdom || user.level * 6}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Opponents */}
            <div>
              <h2 className="text-xl font-bold mb-4">Available Opponents</h2>
              <div className="space-y-3">
                {opponents.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-muted-foreground text-center">No opponents available right now</p>
                    </CardContent>
                  </Card>
                ) : (
                  opponents.map(opponent => (
                    <Card key={opponent.id} className="hover:border-primary transition-colors">
                      <CardContent className="pt-6 flex items-center justify-between">
                        <div>
                          <p className="font-bold">{opponent.username}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{opponent.realm}</Badge>
                            <Badge variant="secondary">{opponent.rank}</Badge>
                            <span className="text-xs text-muted-foreground">Lvl {opponent.level}</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleChallenge(opponent.id)}
                          disabled={battleInProgress}
                          data-testid={`button-challenge-${opponent.id}`}
                          className="active-elevate-2"
                        >
                          {battleInProgress ? "⚔️..." : "Challenge"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
