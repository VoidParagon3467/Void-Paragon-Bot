import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const token = sessionStorage.getItem("auth_session");
    if (token) {
      setLocation("/");
    }
  }, [setLocation]);

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
