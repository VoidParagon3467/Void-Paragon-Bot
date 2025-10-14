import { Home, BookOpen, Users, Bell, User, Settings, LayoutDashboard, Code } from "lucide-react";
import { Link } from "wouter";

interface SideNavProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: "admin" | "moderator" | "user" | "guest";
}

export function SideNav({ isOpen, onClose, userRole }: SideNavProps) {
  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/novels", label: "Novels", icon: BookOpen },
    { href: "/community", label: "Community", icon: Users },
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/profile", label: "Profile", icon: User },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const adminLinks = [
    { href: "/admin", label: "Admin Dashboard", icon: LayoutDashboard },
    { href: "/coding", label: "Code Editor", icon: Code },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}
      <nav
        className={`fixed top-14 left-0 bottom-0 w-64 bg-card border-r border-border z-50 transform transition-transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 space-y-2">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              <div
                className="flex items-center gap-3 px-4 py-2 rounded-md hover-elevate text-foreground cursor-pointer"
                onClick={onClose}
                data-testid={`link-${link.label.toLowerCase()}`}
              >
                <link.icon className="w-5 h-5" />
                <span>{link.label}</span>
              </div>
            </Link>
          ))}

          {userRole === "admin" && (
            <>
              <div className="border-t border-border my-4" />
              {adminLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <div
                    className="flex items-center gap-3 px-4 py-2 rounded-md hover-elevate text-primary cursor-pointer"
                    onClick={onClose}
                    data-testid={`link-${link.label.toLowerCase().replace(' ', '-')}`}
                  >
                    <link.icon className="w-5 h-5" />
                    <span>{link.label}</span>
                  </div>
                </Link>
              ))}
            </>
          )}
        </div>
      </nav>
    </>
  );
}
