import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface MissionSystemProps {
  userId: number;
}

export default function MissionSystem({ userId }: MissionSystemProps) {
  const { data: missions = [], isLoading } = useQuery({
    queryKey: [`/api/user-missions/${userId}`],
  });

  const activeMissions = (missions as any[])?.filter((m: any) => m.status === 'active') || [];

  const getMissionColor = (type: string) => {
    switch (type) {
      case 'daily': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'weekly': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'monthly': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getMissionProgress = (mission: any) => {
    if (!mission.progress || !mission.mission.requirements) return 0;
    
    const requirements = mission.mission.requirements;
    const progress = mission.progress;
    
    // Calculate progress based on the first requirement
    const firstRequirement = Object.keys(requirements)[0];
    if (firstRequirement && requirements[firstRequirement]) {
      const current = progress[firstRequirement] || 0;
      const required = requirements[firstRequirement];
      return Math.min((current / required) * 100, 100);
    }
    
    return 0;
  };

  if (isLoading) {
    return (
      <Card className="glass-card border-primary/30">
        <CardHeader>
          <CardTitle className="font-mono">Active Missions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-700 rounded mb-2" />
                <div className="h-3 bg-gray-800 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-2xl font-bold font-mono">Active Missions</CardTitle>
        <Button className="bg-primary hover:bg-primary/80">
          <i className="fas fa-refresh mr-2" />
          Refresh
        </Button>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {activeMissions.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-scroll text-4xl text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No active missions</p>
              <p className="text-sm text-muted-foreground mt-2">
                New missions will be assigned automatically!
              </p>
            </div>
          ) : (
            activeMissions.map((userMission: any) => {
              const mission = userMission.mission;
              const progress = getMissionProgress(userMission);
              
              return (
                <div key={userMission.id} className="border border-primary/30 rounded-lg p-4 hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-primary">{mission.title}</h4>
                      <p className="text-sm text-muted-foreground">{mission.description}</p>
                    </div>
                    <Badge className={getMissionColor(mission.type)}>
                      {mission.type}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-2 flex-1">
                      <Progress value={progress} className="flex-1 h-2" />
                      <span className="text-xs text-muted-foreground min-w-fit">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <i className="fas fa-gem text-yellow-500 text-xs" />
                      <span className="text-xs text-yellow-500 font-semibold">
                        {mission.crystalReward}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
