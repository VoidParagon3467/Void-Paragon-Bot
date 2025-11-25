import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface InventoryShopProps {
  userId: number;
}

export default function InventoryShop({ userId }: InventoryShopProps) {
  const [filter, setFilter] = useState("all");
  const { toast } = useToast();

  const { data: userItems = [], isLoading: inventoryLoading } = useQuery({
    queryKey: [`/api/user-items/${userId}`],
  });

  const { data: shopItems = [], isLoading: shopLoading } = useQuery({
    queryKey: ['/api/items'],
  });

  const purchaseMutation = useMutation({
    mutationFn: async ({ itemId, quantity = 1 }: { itemId: number; quantity?: number }) => {
      const response = await apiRequest("POST", "/api/shop/purchase", {
        userId,
        itemId,
        quantity,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Purchase Successful!",
          description: `You acquired ${data.item.name}`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/user-items'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      } else {
        toast({
          title: "Purchase Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
  });

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'common': return 'text-gray-400 border-gray-500';
      case 'uncommon': return 'text-green-400 border-green-500';
      case 'rare': return 'text-blue-400 border-blue-500';
      case 'epic': return 'text-purple-400 border-purple-500';
      case 'legendary': return 'text-yellow-400 border-yellow-500';
      case 'mythical': return 'text-red-400 border-red-500';
      default: return 'text-gray-400 border-gray-500';
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'weapon': return 'fas fa-sword';
      case 'armor': return 'fas fa-shield-alt';
      case 'consumable': return 'fas fa-flask';
      case 'treasure': return 'fas fa-gem';
      default: return 'fas fa-box';
    }
  };

  const filteredItems = (userItems as any[])?.filter((userItem: any) => {
    if (filter === "all") return true;
    return userItem.item.type === filter;
  }) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <div className="lg:col-span-2">
        <Card className="glass-card border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold font-mono">Inventory</CardTitle>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => setFilter("all")}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={filter === "weapon" ? "default" : "outline"}
                onClick={() => setFilter("weapon")}
              >
                Weapons
              </Button>
              <Button
                size="sm"
                variant={filter === "armor" ? "default" : "outline"}
                onClick={() => setFilter("armor")}
              >
                Armor
              </Button>
              <Button
                size="sm"
                variant={filter === "consumable" ? "default" : "outline"}
                onClick={() => setFilter("consumable")}
              >
                Consumables
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            {inventoryLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="glass-card rounded-lg p-3 animate-pulse">
                    <div className="w-12 h-12 bg-gray-700 rounded-lg mx-auto mb-2" />
                    <div className="h-3 bg-gray-700 rounded mb-1" />
                    <div className="h-2 bg-gray-800 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredItems.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <i className="fas fa-box-open text-4xl text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Your inventory is empty</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Visit the shop to purchase items!
                    </p>
                  </div>
                ) : (
                  filteredItems.map((userItem: any) => (
                    <div key={userItem.id} className={`glass-card rounded-lg p-3 hover:border-primary/50 transition-colors cursor-pointer group ${getRarityColor(userItem.item.rarity)}`}>
                      <div className={`w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-current to-current/80 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform opacity-20 group-hover:opacity-30`}>
                        <i className={`${getItemIcon(userItem.item.type)} text-white`} />
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-semibold truncate">
                          {userItem.item.name}
                          {userItem.isEquipped && " ⚡"}
                        </div>
                        <div className="text-xs opacity-70">{userItem.item.rarity}</div>
                        {userItem.quantity > 1 && (
                          <div className="text-xs">x{userItem.quantity}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                
                <div className="glass-card rounded-lg p-3 border-dashed border-gray-600 hover:border-gray-500 transition-colors cursor-pointer flex items-center justify-center">
                  <i className="fas fa-plus text-gray-500 text-xl" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card className="glass-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-xl font-bold font-mono">Shop</CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {shopLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-700 rounded-lg" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-700 rounded mb-1" />
                      <div className="h-3 bg-gray-800 rounded" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              shopItems?.slice(0, 6).map((item: any) => (
                <div key={item.id} className={`border rounded-lg p-4 hover:border-primary/50 transition-colors ${getRarityColor(item.rarity)}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 bg-gradient-to-br from-current to-current/80 rounded-lg flex items-center justify-center opacity-20`}>
                      <i className={`${getItemIcon(item.type)} text-white`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-xs opacity-70">{item.rarity} {item.type}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        <i className="fas fa-gem text-yellow-500 text-xs" />
                        <span className="text-sm font-semibold">{item.price?.toLocaleString()}</span>
                        <Button
                          size="sm"
                          onClick={() => purchaseMutation.mutate({ itemId: item.id })}
                          disabled={purchaseMutation.isPending}
                          className="ml-auto"
                        >
                          {purchaseMutation.isPending ? (
                            <i className="fas fa-spinner fa-spin" />
                          ) : (
                            "Buy"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            <Button className="w-full mt-6 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold hover:from-yellow-600 hover:to-yellow-700">
              View Full Shop
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
