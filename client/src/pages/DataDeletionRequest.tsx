import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function DataDeletionRequest() {
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleRequestDeletion = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/request-data-deletion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to submit deletion request");
      }

      toast({
        title: "Success",
        description: "Your data deletion request has been submitted. We'll process it within 30 days.",
      });

      setTimeout(() => {
        setLocation("/settings");
      }, 2000);
    } catch (error) {
      console.error("Error submitting deletion request:", error);
      toast({
        title: "Error",
        description: "Failed to submit deletion request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Back Button */}
        <button
          onClick={() => setLocation("/settings")}
          className="flex items-center gap-2 text-cyan-400 hover:underline mb-8"
          data-testid="button-back-to-settings"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </button>

        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-cyan-400">Request Account & Data Deletion</h1>
            <p className="text-muted-foreground">Remove your account and all associated data from Nexus Match</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-cyan-400" />
                Data Deletion Process
              </CardTitle>
              <CardDescription>What happens when you request deletion</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">What Gets Deleted:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Your user account and profile information</li>
                    <li>Profile images and game portfolios</li>
                    <li>Match requests and connection history</li>
                    <li>Chat and voice channel messages</li>
                    <li>All personal data and preferences</li>
                    <li>Authentication tokens and session data</li>
                  </ul>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">What Might Be Retained (if required by law):</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Fraud investigation records (up to 2 years if legally required)</li>
                    <li>Abuse or safety reports you were involved in</li>
                    <li>Transaction history for billing purposes (up to 7 years if required by tax laws)</li>
                  </ul>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">Timeline:</h3>
                  <p className="text-sm text-muted-foreground">
                    We will process your deletion request within 30 days. Your account will be deactivated immediately after submission.
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-semibold text-foreground">Before You Go:</h3>
                <p className="text-sm text-muted-foreground">
                  This action is permanent and cannot be undone. If you're having issues with the app or service, we'd love to hear your feedback. You can also contact us at{" "}
                  <a href="mailto:rxplorerh@gmail.com" className="text-cyan-400 hover:underline">
                    rxplorerh@gmail.com
                  </a>{" "}
                  to discuss any concerns.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-destructive">Confirm Deletion Request</CardTitle>
              <CardDescription>This action cannot be undone</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                By clicking the button below, you are requesting that Nexus Match permanently delete your account and all associated personal data.
              </p>
              <Button
                onClick={handleRequestDeletion}
                disabled={isSubmitting}
                className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                data-testid="button-confirm-deletion"
              >
                {isSubmitting ? "Submitting..." : "Request Account Deletion"}
              </Button>
              <Button
                onClick={() => setLocation("/settings")}
                variant="outline"
                className="w-full"
                data-testid="button-cancel-deletion"
              >
                Cancel
              </Button>
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground text-center">
            <p>For more information, see our <a href="/privacy-policy" className="text-cyan-400 hover:underline">Privacy Policy</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}
