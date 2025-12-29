import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gamepad2, Phone, Shield } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { type User } from "@shared/schema";
import { getApiUrl } from "@/lib/api";
import { AuthStorage } from "@/lib/storage";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [phoneStep, setPhoneStep] = useState<"phone" | "code" | "register">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [firebaseToken, setFirebaseToken] = useState<string>("");
  const [gamertagInput, setGamertagInput] = useState("");

  const [phoneRegisterData, setPhoneRegisterData] = useState({
    gamertag: "",
    firstName: "",
    lastName: "",
    age: undefined as number | undefined,
  });

  const handleGamertagLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
      
      // Wait a moment for session to settle
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

  const handleGoogleLogin = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        setIsLoading(true);
        
        // Trigger native Google Sign-In via Firebase
        // The auth listener (useAuth.ts) will handle token verification with the backend
        await FirebaseAuthentication.signInWithGoogle();
      } catch (error: any) {
        if (error?.code === 'CANCELLED') {
          console.log("Sign in cancelled");
          return;
        }
        
        console.error("Google Sign-In error:", error);
        toast({
          title: "Sign In Failed",
          description: error?.message || "Could not sign in with Google",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      // Web fallback - redirect to OAuth flow
      window.location.href = getApiUrl("/api/auth/google");
    }
  };

  const setupRecaptcha = () => {
    if (!auth) return null;
    
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
        }
      });
    }
    return (window as any).recaptchaVerifier;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFirebaseConfigured() || !auth) {
      toast({
        title: "Firebase not configured",
        description: "Phone authentication is not available",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;
      const appVerifier = setupRecaptcha();

      if (!appVerifier) {
        throw new Error("Failed to setup reCAPTCHA");
      }

      delete (window as any).phoneConfirmation;
      
      const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
      setConfirmationResult(confirmation);
      (window as any).phoneConfirmation = confirmation;
      setPhoneStep("code");

      toast({
        title: "Code sent!",
        description: `Verification code sent to ${fullPhoneNumber}`,
      });
    } catch (error: any) {
      console.error("Error sending code:", error);
      toast({
        title: "Failed to send code",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const confirmation = confirmationResult || (window as any).phoneConfirmation;
    
    if (!confirmation) {
      toast({
        title: "Error",
        description: "Please request a new code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const trimmedCode = verificationCode.trim();
      const result = await confirmation.confirm(trimmedCode);
      const idToken = await result.user.getIdToken();
      setFirebaseToken(idToken);

      const verifyResponse = await fetch(getApiUrl("/api/auth/phone/verify-token"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ firebaseToken: idToken }),
      });

      if (!verifyResponse.ok) {
        const error = await verifyResponse.json();
        throw new Error(error.message || "Verification failed");
      }

      const data = await verifyResponse.json();

      delete (window as any).phoneConfirmation;
      
      if (data.userExists) {
        const loginResponse = await fetch(getApiUrl("/api/auth/phone/login"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ firebaseToken: idToken }),
        });

        if (!loginResponse.ok) {
          const error = await loginResponse.json();
          throw new Error(error.message || "Login failed");
        }

        const loginData = await loginResponse.json();
        if (loginData.token) {
          await AuthStorage.setToken(loginData.token);
        }

        toast({
          title: "Welcome back!",
          description: "You've successfully logged in.",
        });
        onAuthSuccess();
      } else {
        setPhoneStep("register");
        toast({
          title: "Phone verified!",
          description: "Now complete your profile to continue.",
        });
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      toast({
        title: "Verification failed",
        description: error.message || "Please check your code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        ...phoneRegisterData,
        firebaseToken,
        age: phoneRegisterData.age || undefined,
      };

      const response = await fetch(getApiUrl("/api/auth/phone/register"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }

      const regData = await response.json();
      if (regData.token) {
        await AuthStorage.setToken(regData.token);
      }

      toast({
        title: "Account created!",
        description: "Welcome to Nexus Match!",
      });

      onAuthSuccess();
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderPhoneStep = () => {
    switch (phoneStep) {
      case "phone":
        return (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone-number" data-testid="label-phone">Phone Number</Label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-24 px-3 py-2 bg-background border border-input rounded-md"
                  data-testid="select-country-code"
                >
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+86">🇨🇳 +86</option>
                  <option value="+81">🇯🇵 +81</option>
                  <option value="+49">🇩🇪 +49</option>
                  <option value="+33">🇫🇷 +33</option>
                </select>
                <Input
                  id="phone-number"
                  data-testid="input-phone-number"
                  type="tel"
                  placeholder="1234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  className="flex-1"
                />
              </div>
            </div>
            <div id="recaptcha-container"></div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !phoneNumber}
              data-testid="button-send-code"
            >
              <Phone className="mr-2 h-4 w-4" />
              {isLoading ? "Sending..." : "Send Verification Code"}
            </Button>
          </form>
        );

      case "code":
        return (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verification-code" data-testid="label-code">Verification Code</Label>
              <Input
                id="verification-code"
                data-testid="input-verification-code"
                type="text"
                placeholder="123456"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
                required
              />
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to {countryCode}{phoneNumber}
              </p>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || verificationCode.length !== 6}
              data-testid="button-verify-code"
            >
              <Shield className="mr-2 h-4 w-4" />
              {isLoading ? "Verifying..." : "Verify Code"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setPhoneStep("phone")}
              data-testid="button-back-to-phone"
            >
              Back
            </Button>
          </form>
        );

      case "register":
        return (
          <form onSubmit={handlePhoneRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gamertag" data-testid="label-gamertag">Gamertag</Label>
              <Input
                id="gamertag"
                data-testid="input-gamertag"
                type="text"
                placeholder="Enter your gamertag"
                value={phoneRegisterData.gamertag}
                onChange={(e) =>
                  setPhoneRegisterData({ ...phoneRegisterData, gamertag: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" data-testid="label-firstname">First Name</Label>
                <Input
                  id="firstName"
                  data-testid="input-firstname"
                  type="text"
                  placeholder="First name"
                  value={phoneRegisterData.firstName || ""}
                  onChange={(e) =>
                    setPhoneRegisterData({ ...phoneRegisterData, firstName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" data-testid="label-lastname">Last Name</Label>
                <Input
                  id="lastName"
                  data-testid="input-lastname"
                  type="text"
                  placeholder="Last name"
                  value={phoneRegisterData.lastName || ""}
                  onChange={(e) =>
                    setPhoneRegisterData({ ...phoneRegisterData, lastName: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="age" data-testid="label-age">Age</Label>
              <Input
                id="age"
                data-testid="input-age"
                type="number"
                placeholder="Age"
                value={phoneRegisterData.age || ""}
                onChange={(e) =>
                  setPhoneRegisterData({
                    ...phoneRegisterData,
                    age: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !phoneRegisterData.gamertag}
              data-testid="button-complete-registration"
            >
              <Gamepad2 className="mr-2 h-4 w-4" />
              {isLoading ? "Creating Account..." : "Complete Registration"}
            </Button>
          </form>
        );
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
            Find your perfect gaming partner
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="gamertag" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="gamertag" data-testid="tab-gamertag">Gamertag</TabsTrigger>
              <TabsTrigger value="google" data-testid="tab-google">Google</TabsTrigger>
              <TabsTrigger value="phone" data-testid="tab-phone">Phone</TabsTrigger>
            </TabsList>

            <TabsContent value="gamertag" className="space-y-4">
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
            </TabsContent>

            <TabsContent value="google" className="space-y-4">
              <Button
                onClick={handleGoogleLogin}
                className="w-full"
                variant="outline"
                data-testid="button-google-login"
              >
                <SiGoogle className="mr-2 h-4 w-4" />
                Continue with Google
              </Button>
            </TabsContent>

            <TabsContent value="phone">
              {renderPhoneStep()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
