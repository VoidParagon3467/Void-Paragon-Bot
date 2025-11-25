import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useRef, useState } from "react";
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check for OAuth callback with session parameter FIRST
    const params = new URLSearchParams(window.location.search);
    const sessionFromUrl = params.get("session");
    
    console.log("[SessionHandler] URL search string:", window.location.search);
    console.log("[SessionHandler] Session from URL:", sessionFromUrl);
    
    if (sessionFromUrl) {
      console.log("[SessionHandler] ✅ FOUND TOKEN IN URL - STORING");
      sessionStorage.setItem("auth_session", sessionFromUrl);
      // Clean URL and mark ready
      window.history.replaceState({}, document.title, "/");
    }
    
    // Mark ready AFTER token is stored
    setReady(true);
  }, []);

  // Don't render Router until we've processed the token
  if (!ready) {
    return null;
  }

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
