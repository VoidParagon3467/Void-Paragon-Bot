import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import ProfilePage from "@/pages/profile";
import SparPage from "@/pages/spar";
import InventoryPage from "@/pages/inventory";
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
