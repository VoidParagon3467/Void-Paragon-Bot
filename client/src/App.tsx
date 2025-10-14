import { useState, useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Header } from "@/components/Header";
import { SideNav } from "@/components/SideNav";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import NovelsPage from "@/pages/NovelsPage";
import CommunityPage from "@/pages/CommunityPage";
import AdminDashboard from "@/pages/AdminDashboard";
import CodingPage from "@/pages/CodingPage";
import ProfilePage from "@/pages/ProfilePage";
import NotificationsPage from "@/pages/NotificationsPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/not-found";

function Router() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  
  if (!user) return <LoginPage />;

  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/novels" component={NovelsPage} />
      <Route path="/community" component={CommunityPage} />
      <Route path="/notifications" component={NotificationsPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/coding" component={CodingPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-background">
            {user && (
              <>
                <Header
                  onMenuClick={() => setMenuOpen(!menuOpen)}
                  userName={user.email}
                />
                <SideNav
                  isOpen={menuOpen}
                  onClose={() => setMenuOpen(false)}
                  userRole={user.email === "paragon3467@gmail.com" ? "admin" : "user"}
                />
              </>
            )}
            <main className={user ? "pt-14" : ""}>
              <Router />
            </main>
          </div>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
