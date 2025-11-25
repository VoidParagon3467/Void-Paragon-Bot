import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const [, setLocation] = useLocation();
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;

    // Check if we have a session token from URL (OAuth callback)
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("session");
    
    if (urlToken) {
      redirected.current = true;
      sessionStorage.setItem("auth_session", urlToken);
      setLocation("/");
      return;
    }

    // Check if we already have a token in storage
    const token = sessionStorage.getItem("auth_session");
    if (token) {
      redirected.current = true;
      setLocation("/");
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Void Cultivation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            Sign in with your Discord account to begin your cultivation journey
          </p>
          <Button 
            className="w-full" 
            onClick={() => (window.location.href = "/api/auth/login")}
            data-testid="button-discord-login"
          >
            Sign in with Discord
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
