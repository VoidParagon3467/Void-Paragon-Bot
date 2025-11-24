import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Admin from "@/pages/admin";
import Profile from "@/pages/profile";
import Missions from "@/pages/missions";
import Inventory from "@/pages/inventory";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/profile" component={Profile} />
      <Route path="/missions" component={Missions} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/admin" component={Admin} />
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
