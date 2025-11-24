import { useQuery } from "@tanstack/react-query";
import MissionSystem from "@/components/MissionSystem";
import { useWebSocket } from "@/hooks/useWebSocket";
import { queryClient } from "@/lib/queryClient";

// Mock user data for demo - in production this would come from Discord auth
const MOCK_USER = {
  discordId: "123456789",
  serverId: "987654321"
};

export default function Missions() {
  // Fetch user data
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: [`/api/user/${MOCK_USER.discordId}/${MOCK_USER.serverId}`],
    retry: false,
  });

  // WebSocket for real-time updates
  useWebSocket(MOCK_USER.serverId, (message) => {
    switch (message.type) {
      case 'missionCompleted':
        queryClient.invalidateQueries({ queryKey: ['/api/user-missions'] });
        break;
    }
  });

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Cultivator Not Found</h1>
          <p className="text-gray-300">Begin your cultivation journey by joining a Discord server with Void Paragon Bot.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <MissionSystem userId={user.id} />
        </div>
      </div>
    </div>
  );
}