import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, MessageSquare, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { GroupWithDetails, GroupMessageWithSender } from "@shared/schema";
import { getApiUrl } from "@/lib/api";

interface GroupsProps {
  currentUserId?: string;
}

export function Groups({ currentUserId = "user1" }: GroupsProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newMessage, setNewMessage] = useState("");

  // Fetch user's groups
  const { data: groups = [], isLoading } = useQuery<GroupWithDetails[]>({
    queryKey: ["/api/groups"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/groups"), {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch groups");
      return response.json();
    },
  });

  // Fetch messages for selected group
  const { data: messages = [] } = useQuery<GroupMessageWithSender[]>({
    queryKey: ["/api/groups", selectedGroup, "messages"],
    queryFn: async () => {
      if (!selectedGroup) return [];
      const response = await fetch(
        getApiUrl(`/api/groups/${selectedGroup}/messages`),
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    enabled: !!selectedGroup,
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(getApiUrl("/api/groups"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDesc,
        }),
      });
      if (!response.ok) throw new Error("Failed to create group");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setNewGroupName("");
      setNewGroupDesc("");
      setShowCreate(false);
      toast({ title: "Group created successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to create group", variant: "destructive" });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGroup) throw new Error("No group selected");
      const response = await fetch(
        getApiUrl(`/api/groups/${selectedGroup}/messages`),
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: newMessage }),
        }
      );
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/groups", selectedGroup, "messages"],
      });
      setNewMessage("");
    },
    onError: () => {
      toast({
        title: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const response = await fetch(getApiUrl(`/api/groups/${groupId}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete group");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setSelectedGroup(null);
      toast({ title: "Group deleted" });
    },
  });

  const selectedGroupData = groups.find((g) => g.id === selectedGroup);

  return (
    <div className="flex gap-4 h-screen">
      {/* Groups List */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Groups
          </h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowCreate(!showCreate)}
            data-testid="button-create-group"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {showCreate && (
          <div className="p-4 border-b space-y-3">
            <Input
              placeholder="Group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              data-testid="input-group-name"
            />
            <Textarea
              placeholder="Description (optional)"
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              className="resize-none"
              data-testid="input-group-description"
            />
            <Button
              className="w-full"
              onClick={() => createGroupMutation.mutate()}
              disabled={createGroupMutation.isPending || !newGroupName}
              data-testid="button-create-group-submit"
            >
              {createGroupMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2 p-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-2">Loading...</p>
          ) : groups.length === 0 ? (
            <p className="text-sm text-muted-foreground p-2">
              No groups yet. Create one!
            </p>
          ) : (
            groups.map((group) => (
              <Card
                key={group.id}
                className={`cursor-pointer hover-elevate transition-colors ${
                  selectedGroup === group.id ? "border-primary" : ""
                }`}
                onClick={() => setSelectedGroup(group.id)}
                data-testid={`card-group-${group.id}`}
              >
                <CardHeader className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{group.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {group.memberCount} members
                      </p>
                    </div>
                    {group.creatorId === currentUserId && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteGroupMutation.mutate(group.id);
                        }}
                        data-testid={`button-delete-group-${group.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedGroupData ? (
          <>
            {/* Header */}
            <div className="border-b p-4">
              <h2 className="font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {selectedGroupData.name}
              </h2>
              {selectedGroupData.description && (
                <p className="text-sm text-muted-foreground">
                  {selectedGroupData.description}
                </p>
              )}
              <div className="flex gap-2 mt-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {selectedGroupData.memberCount} members
                </Badge>
                {selectedGroupData.groupLanguage && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedGroupData.groupLanguage}
                  </Badge>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  No messages yet. Start the conversation!
                </p>
              ) : (
                messages.map((msg) => (
                  <Card
                    key={msg.id}
                    className={`p-3 ${
                      msg.senderId === currentUserId ? "bg-primary/10" : ""
                    }`}
                    data-testid={`message-${msg.id}`}
                  >
                    <div className="flex items-start gap-2">
                      {msg.senderProfileImageUrl && (
                        <img
                          src={msg.senderProfileImageUrl}
                          alt={msg.senderGamertag || "User"}
                          className="h-8 w-8 rounded-full"
                          data-testid={`img-avatar-${msg.senderId}`}
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">
                            {msg.senderGamertag || "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {msg.createdAt
                              ? new Date(msg.createdAt).toLocaleTimeString()
                              : ""}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{msg.message}</p>
                        {msg.translations &&
                          typeof msg.translations === "object" &&
                          Object.keys(
                            msg.translations as Record<string, unknown>
                          ).length > 0 && (
                            <div className="text-xs text-muted-foreground mt-2 space-y-1">
                              {Object.entries(
                                msg.translations as Record<string, string>
                              ).map(([lang, text]: [string, unknown]) => (
                                <div key={lang}>
                                  <span className="font-semibold">
                                    {lang}:
                                  </span>{" "}
                                  {String(text)}
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Input */}
            <div className="border-t p-4 space-y-2">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessageMutation.mutate();
                    }
                  }}
                  className="resize-none"
                  data-testid="input-message"
                />
                <Button
                  onClick={() => sendMessageMutation.mutate()}
                  disabled={
                    sendMessageMutation.isPending || !newMessage.trim()
                  }
                  data-testid="button-send-message"
                >
                  Send
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a group to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
