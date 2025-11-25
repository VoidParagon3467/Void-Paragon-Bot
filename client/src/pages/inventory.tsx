import { useQuery } from "@tanstack/react-query";
import InventoryShop from "@/components/InventoryShop";
import Navigation from "@/components/Navigation";
import { useWebSocket } from "@/hooks/useWebSocket";
import { queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";

export default function Inventory() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("auth_session");
    if (stored) setSessionToken(stored);
  }, []);

  // Fetch user data
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: [`/api/auth/me`, sessionToken],
    queryFn: async () => {
      if (!sessionToken) return null;
      const res = await fetch(`/api/auth/me?session=${sessionToken}`);
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled: !!sessionToken,
  });

  // Fetch server settings to check if user is Sect Master
  const { data: serverSettings } = useQuery({
    queryKey: [`/api/server-settings/${user?.serverId}`],
    retry: false,
    enabled: !!user?.serverId,
  });

  const isSectMaster = user?.isSupremeSectMaster || serverSettings?.sectMasterId === user?.discordId;

  // WebSocket for real-time updates
  useWebSocket(user?.serverId || '', (message) => {
    switch (message.type) {
      case 'userUpdated':
      case 'itemPurchased':
      case 'itemEquipped':
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user-items'] });
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
          <h2 className="text-3xl font-bold text-white">Inventory & Shop</h2>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-purple-200">Void Crystals</p>
              <p className="text-xl font-bold text-purple-400">{user?.voidCrystals || 0}</p>
            </div>
          </div>
        </div>

        {/* Inventory & Shop */}
        <InventoryShop userId={user?.id} />
      </div>
    </div>
  );
}