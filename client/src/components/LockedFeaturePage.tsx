import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface LockedFeaturePageProps {
  featureName: string;
  description?: string;
}

export function LockedFeaturePage({ featureName, description }: LockedFeaturePageProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted">
      <Card className="w-full max-w-md mx-4 shadow-lg">
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl" />
            <Lock className="w-16 h-16 text-destructive relative" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Feature Locked</h2>
            <p className="text-muted-foreground">
              {description || `The ${featureName} feature has been locked by administrators.`}
            </p>
          </div>

          <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-4 w-full">
            <p>This feature is temporarily unavailable. Please try again later or contact support.</p>
          </div>

          <Button 
            onClick={() => setLocation("/")}
            className="w-full"
          >
            Return Home
          </Button>
        </div>
      </Card>
    </div>
  );
}
