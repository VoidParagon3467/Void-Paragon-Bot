import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, Home, Swords, Backpack, Scroll, Zap, Users, Crown, Gift, Settings, LogOut } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
}

export function DashboardLayout({ children, user, onLogout }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [location] = useLocation();

  const isSupremeSectMaster = user?.isSupremeSectMaster;

  const menuItems = [
    { path: "/", label: "Profile", icon: Home },
    { path: "/spar", label: "Spar", icon: Swords },
    { path: "/inventory", label: "Inventory", icon: Backpack },
    { path: "/missions", label: "Missions", icon: Scroll },
    { path: "/events", label: "Events", icon: Zap },
    { path: "/factions", label: "Factions", icon: Users },
    { path: "/clans", label: "Clans", icon: Crown },
    { path: "/premium", label: "Premium", icon: Gift },
  ];

  const adminItems = [
    { path: "/admin", label: "Sect Control", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } border-r border-border bg-card transition-all duration-300 flex flex-col`}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className={`${!sidebarOpen && "hidden"} flex items-center gap-2`}>
            <Crown className="w-6 h-6 text-amber-500" />
            <span className="font-bold text-lg">Void</span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            data-testid="button-sidebar-toggle"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {menuItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <Button
                variant={location === item.path ? "default" : "ghost"}
                className="w-full justify-start gap-3"
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className={`${!sidebarOpen && "hidden"}`}>{item.label}</span>
              </Button>
            </Link>
          ))}

          {/* Divider */}
          {isSupremeSectMaster && <div className="my-2 border-t border-border" />}

          {/* Admin Items */}
          {isSupremeSectMaster &&
            adminItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <Button
                  variant={location === item.path ? "default" : "ghost"}
                  className="w-full justify-start gap-3"
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className={`${!sidebarOpen && "hidden"}`}>{item.label}</span>
                </Button>
              </Link>
            ))}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-border space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={onLogout}
            data-testid="button-logout"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className={`${!sidebarOpen && "hidden"}`}>Logout</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="border-b border-border bg-card p-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{user?.username}</h1>
            <p className="text-sm text-muted-foreground">
              {user?.rank} • {user?.realm}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-amber-500">{user?.voidCrystals}</p>
            <p className="text-xs text-muted-foreground">Void Crystals</p>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
