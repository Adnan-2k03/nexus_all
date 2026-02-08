import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gamepad2, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/api";
import { AuthStorage } from "@/lib/storage";
import { auth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [authMode, setAuthMode] = useState<"gamertag" | "phone">("phone");
  const [gamertagInput, setGamertagInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);

  // Phone Auth State
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!auth || typeof window === 'undefined') return;
    
    // Ensure recaptcha-container exists before initializing
    const initVerifier = () => {
      const container = document.getElementById('recaptcha-container');
      if (container && !recaptchaVerifier && auth) {
        try {
          const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
            callback: () => console.log("reCAPTCHA solved")
          });
          setRecaptchaVerifier(verifier);
          console.log("reCAPTCHA initialized successfully");
        } catch (e) {
          console.error("reCAPTCHA init error:", e);
        }
      }
    };

    // Try immediately and also after a short delay to ensure DOM is ready
    initVerifier();
    const timer = setTimeout(initVerifier, 1000);
    
    return () => {
      clearTimeout(timer);
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch (e) {
          console.error("Error clearing verifier:", e);
        }
      }
    };
  }, [auth]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      toast({ title: "Error", description: "Authentication not initialized. Please refresh.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      // Final attempt to initialize if still missing
      let verifier = recaptchaVerifier;
      if (!verifier) {
        verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible'
        });
        setRecaptchaVerifier(verifier);
      }

      console.log("Sending code to:", phoneNumber);
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      setConfirmationResult(confirmation);
      toast({ title: "OTP Sent", description: "Please check your phone for the verification code." });
    } catch (error: any) {
      console.error("Phone auth error details:", error);
      let message = "Failed to send code";
      if (error.code === 'auth/captcha-check-failed') {
        message = "CAPTCHA check failed. Ensure your domain is whitelisted in Firebase console.";
      } else if (error.code === 'auth/invalid-phone-number') {
        message = "Invalid phone number format. Use +[country code][number].";
      } else if (error.code === 'auth/too-many-requests') {
        message = "Too many requests. Please try again later.";
      }
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;

    setIsLoading(true);
    try {
      const result = await confirmationResult.confirm(verificationCode);
      const idToken = await result.user.getIdToken();

      const response = await fetch(getApiUrl("/api/auth/phone/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firebaseToken: idToken }),
      });

      if (response.status === 404) {
        // User needs to register with a gamertag
        setAuthMode("gamertag");
        setIsNewUser(true);
        // We'll store the token temporarily for registration
        (window as any).pendingFirebaseToken = idToken;
        toast({ title: "Welcome!", description: "Please choose a gamertag to complete your profile." });
        return;
      }

      if (!response.ok) throw new Error("Backend login failed");

      const userData = await response.json();
      if (userData.token) await AuthStorage.setToken(userData.token);
      onAuthSuccess();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Verification failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterWithGamertag = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = (window as any).pendingFirebaseToken;
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await fetch(getApiUrl("/api/auth/phone/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseToken: token,
          gamertag: gamertagInput,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Registration failed");
      }

      const userData = await response.json();
      if (userData.token) await AuthStorage.setToken(userData.token);
      onAuthSuccess();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

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

    if (passwordInput.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
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
        body: JSON.stringify({ gamertag: gamertagInput, password: passwordInput, isNewUser }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to authenticate" }));
        toast({
          title: "Error",
          description: error.message || "Failed to authenticate",
          variant: "destructive",
        });
        return;
      }

      const userData = await response.json();
      console.log("[Auth] Authentication successful:", userData);
      
      if (userData.token) {
        await AuthStorage.setToken(userData.token);
      }
      
      setTimeout(() => {
        onAuthSuccess();
      }, 500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Authentication failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(getApiUrl("/api/auth/dev-login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) throw new Error("Dev login failed");

      const userData = await response.json();
      onAuthSuccess();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
      <div id="recaptcha-container"></div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Gamepad2 className="h-12 w-12 text-primary" data-testid="icon-logo" />
          </div>
          <CardTitle className="text-2xl" data-testid="text-title">Welcome to Nexus Match</CardTitle>
          <CardDescription data-testid="text-description">
            {authMode === "phone" ? "Sign in with your phone number" : "Enter your gamertag to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full bg-green-600 hover:bg-green-700 text-white border-none"
            onClick={handleDevLogin}
            disabled={isLoading}
          >
            Quick Dev Login (Click to Start)
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          
          {authMode === "phone" ? (
            !confirmationResult ? (
              <form onSubmit={handleSendCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (with country code)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Include your country code (e.g., +1 for USA, +44 for UK, +91 for India).
                </p>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  <Phone className="mr-2 h-4 w-4" />
                  {isLoading ? "Sending..." : "Send Verification Code"}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setAuthMode("gamertag")}>
                  Use Gamertag instead
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Verification Code</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Verifying..." : "Verify Code"}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setConfirmationResult(null)}>
                  Back
                </Button>
              </form>
            )
          ) : isNewUser && (window as any).pendingFirebaseToken ? (
            <form onSubmit={handleRegisterWithGamertag} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-gamertag">Choose Gamertag</Label>
                <Input
                  id="reg-gamertag"
                  value={gamertagInput}
                  onChange={(e) => setGamertagInput(e.target.value)}
                  placeholder="CoolPlayer123"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                Complete Registration
              </Button>
            </form>
          ) : (
            <form onSubmit={handleGamertagLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gamertag">Gamertag</Label>
                <Input
                  id="gamertag"
                  data-testid="input-gamertag"
                  type="text"
                  placeholder="Enter your gamertag"
                  value={gamertagInput}
                  onChange={(e) => setGamertagInput(e.target.value)}
                  minLength={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  data-testid="input-password"
                  type="password"
                  placeholder="Enter password (min 6 characters)"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  minLength={6}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="new-user"
                  data-testid="checkbox-new-user"
                  type="checkbox"
                  checked={isNewUser}
                  onChange={(e) => setIsNewUser(e.target.checked)}
                  className="rounded border border-input"
                />
                <Label htmlFor="new-user" className="text-sm cursor-pointer">
                  Creating new account?
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || gamertagInput.length < 3 || passwordInput.length < 6}
                data-testid="button-gamertag-login"
              >
                <Gamepad2 className="mr-2 h-4 w-4" />
                {isLoading ? "Processing..." : isNewUser ? "Create Account" : "Sign In"}
              </Button>
              
              <Button variant="ghost" className="w-full" onClick={() => setAuthMode("phone")}>
                Use Phone Number instead
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
