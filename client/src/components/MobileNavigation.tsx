import { Link, useLocation } from "wouter";

interface MobileNavigationProps {
  isSectMaster: boolean;
}

export default function MobileNavigation({ isSectMaster }: MobileNavigationProps) {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 glass-card border-t border-primary/30 md:hidden z-50">
      <div className="flex justify-around items-center h-16">
        <Link href="/">
          <button className={`flex flex-col items-center space-y-1 ${isActive("/") ? "text-primary" : "text-muted-foreground"}`}>
            <i className="fas fa-home text-lg" />
            <span className="text-xs">Home</span>
          </button>
        </Link>
        
        <button className="flex flex-col items-center space-y-1 text-muted-foreground">
          <i className="fas fa-mountain text-lg" />
          <span className="text-xs">Cultivation</span>
        </button>
        
        <button className="flex flex-col items-center space-y-1 text-muted-foreground">
          <i className="fas fa-sword text-lg" />
          <span className="text-xs">Battle</span>
        </button>
        
        <button className="flex flex-col items-center space-y-1 text-muted-foreground">
          <i className="fas fa-store text-lg" />
          <span className="text-xs">Shop</span>
        </button>
        
        {isSectMaster ? (
          <Link href="/admin">
            <button className={`flex flex-col items-center space-y-1 ${isActive("/admin") ? "text-yellow-400" : "text-muted-foreground"}`}>
              <i className="fas fa-crown text-lg" />
              <span className="text-xs">Admin</span>
            </button>
          </Link>
        ) : (
          <button className="flex flex-col items-center space-y-1 text-muted-foreground">
            <i className="fas fa-user text-lg" />
            <span className="text-xs">Profile</span>
          </button>
        )}
      </div>
    </div>
  );
}
