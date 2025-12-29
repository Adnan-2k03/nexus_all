import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gamepad2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/api";
import { AuthStorage } from "@/lib/storage";

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [gamertagInput, setGamertagInput] = useState("");

  const handleGamertagLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (gamertagInput.length < 3) {
      toast({
        title: "Error",
        description: "Gamertag must be at least 3 characters",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(getApiUrl("/api/auth/gamertag-login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ gamertag: gamertagInput }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to login" }));
        toast({
          title: "Error",
          description: error.message || "Failed to login",
          variant: "destructive",
        });
        return;
      }

      const userData = await response.json();
      console.log("[Auth] Gamertag login successful:", userData);
      
      if (userData.token) {
        await AuthStorage.setToken(userData.token);
      }
      
      setTimeout(() => {
        onAuthSuccess();
      }, 500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to login with gamertag",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Gamepad2 className="h-12 w-12 text-primary" data-testid="icon-logo" />
          </div>
          <CardTitle className="text-2xl" data-testid="text-title">Welcome to Nexus Match</CardTitle>
          <CardDescription data-testid="text-description">
            Enter your gamertag to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGamertagLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gamertag">Gamertag</Label>
              <Input
                id="gamertag"
                data-testid="input-gamertag"
                type="text"
                placeholder="Enter your gamertag (min 3 characters)"
                value={gamertagInput}
                onChange={(e) => setGamertagInput(e.target.value)}
                minLength={3}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || gamertagInput.length < 3}
              data-testid="button-gamertag-login"
            >
              <Gamepad2 className="mr-2 h-4 w-4" />
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
