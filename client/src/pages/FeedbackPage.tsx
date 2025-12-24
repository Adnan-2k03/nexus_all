import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MessageSquare, Loader2, Send, Plus, Trash2, Volume2, VolumeX, Users, Lock } from "lucide-react";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { getApiUrl } from "@/lib/api";

interface FeedbackChannel {
  id: string;
  name: string;
  description?: string;
  type: "text" | "voice";
  creatorId: string;
  isActive: boolean;
  createdAt: string;
}

interface FeedbackMessage {
  id: string;
  channelId: string;
  userId: string;
  message: string;
  isDeleted: boolean;
  gamertag?: string | null;
  profileImageUrl?: string | null;
  createdAt: string;
}

export function FeedbackPage() {
  const { toast } = useToast();
  const { isFeatureLocked, isFeatureVisible } = useFeatureFlags();
  const isLocked = isFeatureLocked("feedback");
  const isHidden = !isFeatureVisible("feedback");
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"text" | "voice">("text");

  // Fetch channels
  const { data: channels = [], isLoading, refetch: refetchChannels } = useQuery<FeedbackChannel[]>({
    queryKey: ["/api/feedback/channels"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/feedback/channels"), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch channels");
      return await response.json();
    },
  });

  // Fetch messages for selected channel
  const { data: messages = [], refetch: refetchMessages } = useQuery<FeedbackMessage[]>({
    queryKey: selectedChannel ? ["/api/feedback/channels", selectedChannel, "messages"] : [],
    queryFn: async () => {
      if (!selectedChannel) return [];
      const response = await fetch(getApiUrl(`/api/feedback/channels/${selectedChannel}/messages`), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch messages");
      return await response.json();
    },
    enabled: !!selectedChannel,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!selectedChannel) throw new Error("No channel selected");
      const response = await fetch(getApiUrl(`/api/feedback/channels/${selectedChannel}/messages`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message }),
      });
      if (!response.ok) throw new Error("Failed to send message");
      return await response.json();
    },
    onSuccess: () => {
      setMessageText("");
      refetchMessages();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Create channel mutation
  const createChannelMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(getApiUrl("/api/feedback/channels"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newChannelName, description: "", type: newChannelType }),
      });
      if (!response.ok) throw new Error("Failed to create channel");
      return await response.json();
    },
    onSuccess: () => {
      setNewChannelName("");
      toast({ title: "Channel created!", description: `New ${newChannelType} channel created.` });
      refetchChannels();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      if (!selectedChannel) throw new Error("No channel selected");
      const response = await fetch(getApiUrl(`/api/feedback/channels/${selectedChannel}/messages/${messageId}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete message");
    },
    onSuccess: () => {
      toast({ title: "Message deleted" });
      refetchMessages();
    },
  });

  const handleSendMessage = () => {
    if (!messageText.trim()) {
      toast({ title: "Empty message", variant: "destructive" });
      return;
    }
    sendMessageMutation.mutate(messageText);
  };

  const handleCreateChannel = () => {
    if (!newChannelName.trim()) {
      toast({ title: "Channel name required", variant: "destructive" });
      return;
    }
    createChannelMutation.mutate();
  };

  if (isHidden) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Feature Not Available</h1>
          <p className="text-muted-foreground">This feature has been temporarily disabled.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          Feedback & Community
          {isLocked && <Lock className="h-5 w-5 text-destructive ml-auto" data-testid="icon-locked" />}
        </h1>
        <p className="text-muted-foreground">
          {isLocked ? "This feature has been locked by administrators." : "Join channels to discuss features, report bugs, and connect with the community"}
        </p>
      </div>

      {isLocked && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-md p-4 mb-6">
          <p className="text-destructive font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4" />
            This feature has been locked by administrators
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Channels List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Channels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isLocked ? (
                <p className="text-sm text-muted-foreground text-center py-4">Feature is locked</p>
              ) : (
                <div className="space-y-2">
                  {channels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => setSelectedChannel(channel.id)}
                      className={`w-full text-left p-2 rounded-md transition-colors text-sm font-medium flex items-center gap-2 ${
                        selectedChannel === channel.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-background"
                      }`}
                      data-testid={`button-channel-${channel.id}`}
                    >
                      {channel.type === "voice" ? <Volume2 className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                      <span className="truncate">{channel.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create Channel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Plus className="h-4 w-4" /> New Channel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Channel name"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                disabled={isLocked}
                data-testid="input-channel-name"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={newChannelType === "text" ? "default" : "outline"}
                  onClick={() => setNewChannelType("text")}
                  disabled={isLocked}
                  className="flex-1 text-xs"
                >
                  Text
                </Button>
                <Button
                  size="sm"
                  variant={newChannelType === "voice" ? "default" : "outline"}
                  onClick={() => setNewChannelType("voice")}
                  disabled={isLocked}
                  className="flex-1 text-xs"
                >
                  Voice
                </Button>
              </div>
              <Button
                onClick={handleCreateChannel}
                disabled={createChannelMutation.isPending || isLocked}
                size="sm"
                className="w-full"
                data-testid="button-create-channel"
              >
                Create
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Messages Area */}
        <div className="lg:col-span-3 space-y-4">
          {selectedChannel ? (
            <>
              <Card className="flex flex-col h-[600px]">
                <CardHeader className="border-b">
                  <CardTitle>
                    {channels.find((c) => c.id === selectedChannel)?.name || "Channel"}
                  </CardTitle>
                  <CardDescription>
                    {channels.find((c) => c.id === selectedChannel)?.type === "voice" ? "Voice Discussion" : "Text Discussion"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto space-y-3 py-4">
                  {messages.length === 0 ? (
                    <div className="flex justify-center items-center h-full text-muted-foreground text-sm">
                      No messages yet. Be the first to say something!
                    </div>
                  ) : (
                    messages
                      .filter((m) => !m.isDeleted)
                      .map((msg) => (
                        <div key={msg.id} className="p-3 bg-background rounded-md border flex items-start justify-between gap-2" data-testid={`message-${msg.id}`}>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{msg.gamertag || "Anonymous"}</div>
                            <p className="text-muted-foreground text-sm">{msg.message}</p>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(msg.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteMessageMutation.mutate(msg.id)}
                            className="h-8 w-8 flex-shrink-0"
                            data-testid={`button-delete-message-${msg.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>

              {/* Message Input */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Say something..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.ctrlKey) {
                          handleSendMessage();
                        }
                      }}
                      className="resize-none"
                      data-testid="input-message"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={sendMessageMutation.isPending}
                      size="icon"
                      data-testid="button-send-message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a channel to start chatting</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
