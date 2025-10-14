import { Home, BookOpen, Code, Users, Bell, Settings, User, MessageSquare, LayoutDashboard, Crown } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type UserRole = "admin" | "moderator" | "user" | "guest";

interface AppSidebarProps {
  user?: {
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
    isPremium?: boolean;
  };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const [location] = useLocation();
  
  const items = [
    { title: "Home", url: "/", icon: Home },
    { title: "Novels", url: "/novels", icon: BookOpen },
    { title: "Community", url: "/community", icon: Users },
    { title: "Notifications", url: "/notifications", icon: Bell },
    { title: "Profile", url: "/profile", icon: User },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  const adminItems = [
    { title: "Admin Dashboard", url: "/admin", icon: LayoutDashboard },
    { title: "Code Editor", url: "/coding", icon: Code },
  ];

  const isAdmin = user?.role === "admin";
  const isModerator = user?.role === "moderator";

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-primary">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-primary text-primary-foreground font-serif text-lg">
              {user?.name?.[0] || "V"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-serif font-semibold text-sm truncate">
              {user?.name || "Guest"}
            </p>
            {user?.isPremium && (
              <Badge className="bg-premium text-premium-foreground text-xs mt-1">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(isAdmin || isModerator) && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {isAdmin && adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location === item.url} data-testid={`link-${item.title.toLowerCase().replace(' ', '-')}`}>
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {isModerator && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/moderation"}>
                      <Link href="/moderation">
                        <MessageSquare className="w-4 h-4" />
                        <span>Moderation</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground text-center">
          © 2025 Vøid Pæragon
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
