import { useQuery } from "@tanstack/react-query";
import MissionSystem from "@/components/MissionSystem";
import { useWebSocket } from "@/hooks/useWebSocket";
import { queryClient } from "@/lib/queryClient";

import { useState, useEffect } from "react";

export default function Missions() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("auth_session");
    if (stored) setSessionToken(stored);
  }, []);

  // Fetch user data
  const { data: user = {}, isLoading: userLoading } = useQuery({
    queryKey: [`/api/auth/me`, sessionToken],
    queryFn: async () => {
      if (!sessionToken) return {};
      const res = await fetch(`/api/auth/me?session=${sessionToken}`);
      if (!res.ok) return {};
      return res.json();
    },
    retry: false,
    enabled: !!sessionToken,
  });

  // WebSocket for real-time updates
  useWebSocket((user as any)?.serverId || '', (message) => {
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