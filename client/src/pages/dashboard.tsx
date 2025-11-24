import { useQuery } from "@tanstack/react-query";
import PlayerStatus from "@/components/PlayerStatus";
import RecentActivity from "@/components/RecentActivity";
import Navigation from "@/components/Navigation";
import { useWebSocket } from "@/hooks/useWebSocket";
import { queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { Target, Package, Shield, TrendingUp } from "lucide-react";

// Mock user data for demo - in production this would come from Discord auth
const MOCK_USER = {
  discordId: "123456789",
  serverId: "987654321"
};

export default function Dashboard() {
  // Fetch user data
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: [`/api/user/${MOCK_USER.discordId}/${MOCK_USER.serverId}`],
    retry: false,
  });

  // Fetch server settings to check if user is Sect Master
  const { data: serverSettings } = useQuery({
    queryKey: [`/api/server-settings/${MOCK_USER.serverId}`],
    retry: false,
  });

  const isSectMaster = serverSettings?.sectMasterId === MOCK_USER.discordId;

  // WebSocket for real-time updates
  useWebSocket(MOCK_USER.serverId, (message) => {
    switch (message.type) {
      case 'userUpdated':
      case 'levelUp':
      case 'realmAdvanced':
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        break;
      case 'missionCompleted':
        queryClient.invalidateQueries({ queryKey: ['/api/user-missions'] });
        break;
      case 'battleResult':
        queryClient.invalidateQueries({ queryKey: ['/api/battles'] });
        queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
        break;
    }
  });

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-black to-blue-950 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-black to-blue-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Void Cultivation</h1>
          <p className="text-purple-200">Discord authentication required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-black to-blue-950">
      <Navigation isSectMaster={isSectMaster} />
      
      {/* Main Content */}
      <div className="pt-20 px-4 md:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-white">Dashboard</h2>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-purple-200">Void Crystals</p>
              <p className="text-xl font-bold text-purple-400">{user?.voidCrystals || 0}</p>
            </div>
          </div>
        </div>

        {/* Player Status */}
        <div className="mb-8">
          <PlayerStatus user={user} />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/missions"
            className="group bg-purple-900/50 border border-purple-500/20 rounded-lg p-6 hover:bg-purple-900/70 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-purple-600 p-3 rounded-lg group-hover:bg-purple-500 transition-colors">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Missions</h3>
                <p className="text-purple-200 text-sm">Complete daily tasks</p>
              </div>
            </div>
          </Link>

          <Link
            href="/inventory"
            className="group bg-purple-900/50 border border-purple-500/20 rounded-lg p-6 hover:bg-purple-900/70 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-purple-600 p-3 rounded-lg group-hover:bg-purple-500 transition-colors">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Inventory</h3>
                <p className="text-purple-200 text-sm">Manage your items</p>
              </div>
            </div>
          </Link>

          {isSectMaster && (
            <Link
              href="/admin"
              className="group bg-purple-900/50 border border-purple-500/20 rounded-lg p-6 hover:bg-purple-900/70 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-purple-600 p-3 rounded-lg group-hover:bg-purple-500 transition-colors">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Admin</h3>
                  <p className="text-purple-200 text-sm">Sect management</p>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <RecentActivity serverId={MOCK_USER.serverId} />
        </div>
      </div>
    </div>
  );
}