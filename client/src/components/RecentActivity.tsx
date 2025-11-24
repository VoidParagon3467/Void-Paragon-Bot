import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RecentActivityProps {
  serverId: string;
}

export default function RecentActivity({ serverId }: RecentActivityProps) {
  const { data: activities, isLoading } = useQuery({
    queryKey: [`/api/activities/${serverId}`],
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'battle':
      case 'win':
      case 'victory':
        return { icon: 'fas fa-trophy', color: 'text-green-400', bg: 'bg-green-400' };
      case 'level_up':
      case 'levelup':
        return { icon: 'fas fa-star', color: 'text-yellow-400', bg: 'bg-yellow-400' };
      case 'item_purchase':
      case 'purchase':
        return { icon: 'fas fa-gem', color: 'text-purple-400', bg: 'bg-purple-400' };
      case 'faction':
      case 'faction_joined':
        return { icon: 'fas fa-users', color: 'text-blue-400', bg: 'bg-blue-400' };
      case 'realm_advancement':
        return { icon: 'fas fa-mountain', color: 'text-primary', bg: 'bg-primary' };
      case 'mission_completed':
        return { icon: 'fas fa-check-circle', color: 'text-green-400', bg: 'bg-green-400' };
      default:
        return { icon: 'fas fa-info-circle', color: 'text-gray-400', bg: 'bg-gray-400' };
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  // Mock data for demo since activities might be empty
  const mockActivities = [
    {
      id: 1,
      type: 'battle',
      description: 'Victory! Defeated Shadow Wolf Alpha in PvP',
      user: { username: 'Player1' },
      createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      type: 'level_up',
      description: 'Level Up! Reached Level 47',
      user: { username: 'Player2' },
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    {
      id: 3,
      type: 'item_purchase',
      description: 'Purchased Flame Sword from shop',
      user: { username: 'Player3' },
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    },
    {
      id: 4,
      type: 'faction',
      description: 'Joined faction Celestial Peak',
      user: { username: 'Player4' },
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const displayActivities = activities?.length > 0 ? activities : mockActivities;

  return (
    <Card className="glass-card border-primary/30">
      <CardHeader>
        <CardTitle className="text-2xl font-bold font-mono">Recent Activity</CardTitle>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start space-x-3 animate-pulse">
                  <div className="w-8 h-8 bg-gray-700 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-700 rounded mb-1" />
                    <div className="h-3 bg-gray-800 rounded w-1/3" />
                  </div>
                </div>
              ))
            ) : (
              displayActivities.map((activity: any) => {
                const { icon, color, bg } = getActivityIcon(activity.type);
                
                return (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`w-8 h-8 ${bg} rounded-full flex items-center justify-center flex-shrink-0`}>
                      <i className={`${icon} text-xs text-white`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        {activity.description.includes('Victory!') && (
                          <span className="text-green-400 font-semibold">Victory! </span>
                        )}
                        {activity.description.includes('Level Up!') && (
                          <span className="text-yellow-400 font-semibold">Level Up! </span>
                        )}
                        {activity.description.replace(/^(Victory!|Level Up!) /, '')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
