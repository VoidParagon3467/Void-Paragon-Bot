import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useRef } from "react";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import ProfilePage from "@/pages/profile";
import SparPage from "@/pages/spar";
import InventoryPage from "@/pages/inventory";
import ShopPage from "@/pages/shop";
import MissionsPage from "@/pages/missions";
import EventsPage from "@/pages/events";
import FactionsPage from "@/pages/factions";
import ClansPage from "@/pages/clans";
import PremiumPage from "@/pages/premium";
import AdminPage from "@/pages/admin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ProfilePage} />
      <Route path="/login" component={Login} />
      <Route path="/spar" component={SparPage} />
      <Route path="/inventory" component={InventoryPage} />
      <Route path="/shop" component={ShopPage} />
      <Route path="/missions" component={MissionsPage} />
      <Route path="/events" component={EventsPage} />
      <Route path="/factions" component={FactionsPage} />
      <Route path="/clans" component={ClansPage} />
      <Route path="/premium" component={PremiumPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function SessionHandler({ children }: { children: React.ReactNode }) {
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    // Check for OAuth callback with session parameter
    const params = new URLSearchParams(window.location.search);
    const sessionFromUrl = params.get("session");
    const existingToken = sessionStorage.getItem("auth_session");
    
    console.log("[SessionHandler] URL search string:", window.location.search);
    console.log("[SessionHandler] Session from URL:", sessionFromUrl?.substring(0, 10));
    console.log("[SessionHandler] Existing token:", existingToken?.substring(0, 10));
    
    if (sessionFromUrl) {
      console.log("[SessionHandler] ✅ FOUND TOKEN IN URL - STORING and reloading");
      sessionStorage.setItem("auth_session", sessionFromUrl);
      // Force reload to ensure ProfilePage sees the token
      window.location.href = "/";
    } else {
      console.log("[SessionHandler] No session in URL");
    }
  }, []);

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark">
          <SessionHandler>
            <Toaster />
            <Router />
          </SessionHandler>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
