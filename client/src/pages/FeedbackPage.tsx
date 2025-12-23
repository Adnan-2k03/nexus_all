import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MessageSquare, Loader2, Send, Users } from "lucide-react";
import { getApiUrl } from "@/lib/api";

interface Feedback {
  id: string;
  userId: string;
  gamertag: string;
  message: string;
  createdAt: string;
}

export function FeedbackPage() {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState("");

  // Fetch feedback list
  const { data: feedbackList = [], isLoading } = useQuery<Feedback[]>({
    queryKey: ["/api/feedback"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/feedback"), {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch feedback");
      return await response.json();
    },
  });

  // Submit feedback mutation
  const submitMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest("POST", "/api/feedback", { message });
    },
    onSuccess: () => {
      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted",
      });
      setFeedback("");
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit feedback",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!feedback.trim()) {
      toast({
        title: "Empty feedback",
        description: "Please write something before submitting",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate(feedback);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          Feedback & Suggestions
        </h1>
        <p className="text-muted-foreground">Help us improve GameMatch with your ideas and feedback</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feedback Form */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Share Your Feedback</CardTitle>
              <CardDescription>Tell us what you think or suggest new features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="What's on your mind? Feature ideas, bug reports, general feedback..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[120px]"
                data-testid="input-feedback-message"
              />
              <Button
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                className="w-full gap-2"
                data-testid="button-submit-feedback"
              >
                {submitMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit Feedback
              </Button>
            </CardContent>
          </Card>

          {/* Recent Feedback */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : feedbackList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No feedback yet. Be the first to share!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {feedbackList.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-background/50 border border-border rounded-md"
                      data-testid={`feedback-item-${item.id}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="font-medium text-sm">{item.gamertag}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Voice Channel Card */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20 md:top-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Voice Discussion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-center">
                <div className="mb-3">
                  <Users className="h-8 w-8 text-primary mx-auto opacity-50" />
                </div>
                <p className="text-sm font-medium text-foreground mb-3">
                  Join our voice channel to discuss features and improvements live
                </p>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    toast({
                      title: "Coming Soon",
                      description: "Voice channel integration will be available soon",
                    });
                  }}
                  className="w-full"
                  data-testid="button-join-voice-feedback"
                >
                  Join Voice Channel
                </Button>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-foreground mb-1">How to Participate:</p>
                  <ul className="text-muted-foreground space-y-1 text-xs">
                    <li>• Share feature ideas</li>
                    <li>• Report bugs</li>
                    <li>• Suggest improvements</li>
                    <li>• Connect with community</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
