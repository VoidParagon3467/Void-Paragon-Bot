import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, User, Target, Package, Shield, Menu, X } from "lucide-react";
import { useState } from "react";

interface NavigationProps {
  isSectMaster: boolean;
}

export default function Navigation({ isSectMaster }: NavigationProps) {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/profile", label: "Profile", icon: User },
    { path: "/missions", label: "Missions", icon: Target },
    { path: "/inventory", label: "Inventory", icon: Package },
    ...(isSectMaster ? [{ path: "/admin", label: "Admin", icon: Shield }] : []),
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-b border-purple-500/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-purple-400">Void</h1>
              <div className="flex space-x-6">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={cn(
                        "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                        location === item.path
                          ? "bg-purple-600 text-white"
                          : "text-purple-200 hover:bg-purple-800/50"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-b border-purple-500/20">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-purple-400">Void</h1>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-purple-200 hover:text-white"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
          
          {isMenuOpen && (
            <div className="mt-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                      location === item.path
                        ? "bg-purple-600 text-white"
                        : "text-purple-200 hover:bg-purple-800/50"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </>
  );
}