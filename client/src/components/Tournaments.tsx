import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { getApiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { insertTournamentSchema } from "@shared/schema";
import { z } from "zod";
import { Trophy, Users, Calendar, Coins, Lock, MessageSquare, Send } from "lucide-react";
import { DailyRewards } from "./DailyRewards";

// Add these to interface TournamentsProps if needed or use from user hook
export function Tournaments({ currentUserId, isAdmin }: TournamentsProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [gameId, setGameId] = useState("");
  const [gameUsername, setGameUsername] = useState("");
  const [saveProfile, setSaveProfile] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["/api/tournaments", expandedTournament, "messages"],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/tournaments/${expandedTournament}/messages`), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!expandedTournament,
    refetchInterval: 5000,
  });

  const sendAnnouncementMutation = useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      const res = await fetch(getApiUrl(`/api/tournaments/${id}/announcements`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error("Failed to send announcement");
      return res.json();
    },
    onSuccess: () => {
      setAnnouncement("");
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", expandedTournament, "messages"] });
      toast({ title: "Success", description: "Announcement sent!" });
    }
  });

  const joinWithCoinsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(getApiUrl(`/api/tournaments/${selectedTournament.id}/join-with-coins`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to join");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsRegisterOpen(false);
      toast({ title: "Success", description: "Registered for tournament!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  useEffect(() => {
    if (selectedTournament && user?.gameProfiles) {
      const profile = (user.gameProfiles as any)[selectedTournament.gameName];
      if (profile) {
        setGameId(profile.inGameId || "");
        setGameUsername(profile.inGameName || "");
      } else {
        setGameId("");
        setGameUsername("");
      }
    }
  }, [selectedTournament, user?.gameProfiles]);

  // ... rest of component logic

  const form = useForm({
    resolver: zodResolver(insertTournamentSchema),
    defaultValues: {
      name: "",
      gameName: "",
      prizePool: 100,
      maxParticipants: 16,
    },
  });

  // Fetch tournaments
  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ["/api/tournaments"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/tournaments"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tournaments");
      return res.json();
    },
  });

  // Fetch user's tournaments
  const { data: userTournaments = [] } = useQuery({
    queryKey: ["/api/user/tournaments", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const res = await fetch(getApiUrl(`/api/user/${currentUserId}/tournaments`), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user tournaments");
      return res.json();
    },
    enabled: !!currentUserId,
  });

  // Create tournament mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch(getApiUrl("/api/tournaments"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create tournament");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/tournaments"] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Tournament created successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create tournament",
        variant: "destructive",
      });
    },
  });

  // Join tournament mutation
  const joinMutation = useMutation({
    mutationFn: async (tournamentId: string) => {
      const res = await fetch(getApiUrl(`/api/tournaments/${tournamentId}/join`), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to join tournament");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/tournaments"] });
      toast({
        title: "Success",
        description: "Joined tournament!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to join tournament",
        variant: "destructive",
      });
    },
  });

  const activeTournaments = useMemo(() => {
    return tournaments.filter((t: any) => t.status !== "completed");
  }, [tournaments]);

  const completedTournaments = useMemo(() => {
    return tournaments.filter((t: any) => t.status === "completed");
  }, [tournaments]);

  const handleCreateTournament = async (data: any) => {
    createMutation.mutate(data);
  };

  const handleJoinTournament = (tournament: any) => {
    setSelectedTournament(tournament);
    setIsRegisterOpen(true);
  };

  const currentTournamentMessages = messages.filter((m: any) => m.tournamentId === expandedTournament);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <DailyRewards userId={currentUserId} />
      
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8" />
            Tournaments
          </h1>
          <p className="text-muted-foreground mt-1">Join gaming tournaments with prize pools funded by ad revenue</p>
        </div>
        {isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button 
                disabled={isLocked} 
                data-testid="button-create-tournament"
                className={isLocked ? "opacity-100" : ""}
              >
                {isLocked && <Lock className="h-4 w-4 mr-2 opacity-100" />}
                Create Tournament
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tournament</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateTournament)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tournament Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Pro Valorant Cup" data-testid="input-tournament-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gameName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Game</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Valorant" data-testid="input-tournament-game" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="prizePool"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prize Pool (Credits)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="100" data-testid="input-prize-pool" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxParticipants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Participants</FormLabel>
                      <Select onValueChange={(v) => field.onChange(parseInt(v))} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="8">8</SelectItem>
                          <SelectItem value="16">16</SelectItem>
                          <SelectItem value="32">32</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createMutation.isPending || isLocked} data-testid="button-submit-tournament">
                  {createMutation.isPending ? "Creating..." : "Create Tournament"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tournament Registration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-indigo-500/10 rounded-md border border-indigo-500/20 text-sm">
              <p className="font-semibold text-indigo-400">Entry Fee: {selectedTournament?.entryFee || 0} Coins</p>
              <p className="text-muted-foreground mt-1">Your Balance: {user?.coins || 0} Coins</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">In-Game Name (IGN)</label>
              <Input 
                value={gameUsername} 
                onChange={(e) => setGameUsername(e.target.value)} 
                placeholder="Your username in the game"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">In-Game ID</label>
              <Input 
                value={gameId} 
                onChange={(e) => setGameId(e.target.value)} 
                placeholder="Your player ID (if applicable)"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="saveProfile" 
                checked={saveProfile} 
                onChange={(e) => setSaveProfile(e.target.checked)} 
              />
              <label htmlFor="saveProfile" className="text-sm">Save this profile for future {selectedTournament?.gameName} tournaments</label>
            </div>
            <Button 
              className="w-full" 
              disabled={joinWithCoinsMutation.isPending || !gameUsername || !gameId}
              onClick={() => joinWithCoinsMutation.mutate({ inGameName: gameUsername, inGameId: gameId, saveProfile })}
            >
              {joinWithCoinsMutation.isPending ? "Registering..." : "Confirm Registration"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : (
        <>
          {/* Active Tournaments */}
          {activeTournaments.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Active & Upcoming</h2>
              <div className="grid gap-4">
                {activeTournaments.map((tournament: any) => {
                  const isJoined = userTournaments.some((ut: any) => ut.id === tournament.id);
                  const isCreator = tournament.createdBy === currentUserId;
                  const isExpanded = expandedTournament === tournament.id;
                  
                  return (
                    <div key={tournament.id} className="space-y-2">
                      <Card className="p-4 hover-elevate cursor-pointer transition" onClick={() => setExpandedTournament(isExpanded ? null : tournament.id)} data-testid={`card-tournament-${tournament.id}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-lg" data-testid={`text-tournament-name-${tournament.id}`}>{tournament.name}</h3>
                              <Badge variant={tournament.status === "active" ? "default" : "secondary"} data-testid={`badge-tournament-status-${tournament.id}`}>{tournament.status}</Badge>
                              {isCreator && <Badge variant="outline">Host</Badge>}
                            </div>
                            <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <span>{tournament.gameName}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Coins className="h-4 w-4 text-yellow-500" />
                                {tournament.prizePool} credits
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {tournament.participantCount || 0}/{tournament.maxParticipants}
                              </span>
                            </div>
                          </div>
                          {!isCreator && !isJoined && (
                            <Button 
                              onClick={(e) => { e.stopPropagation(); handleJoinTournament(tournament); }} 
                              disabled={joinWithCoinsMutation.isPending || isLocked} 
                              data-testid={`button-join-tournament-${tournament.id}`}
                              className={isLocked ? "opacity-100" : ""}
                            >
                              {isLocked && <Lock className="h-4 w-4 mr-2 opacity-100" />}
                              Join
                            </Button>
                          )}
                          {isJoined && <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/20">Joined</Badge>}
                        </div>
                      </Card>

                      {isExpanded && (
                        <div className="grid md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                          {/* Announcements Section */}
                          <Card className="p-4 border-indigo-500/20">
                            <h4 className="font-semibold flex items-center gap-2 mb-3">
                              <MessageSquare className="h-4 w-4 text-indigo-400" />
                              Announcements & Match Details
                            </h4>
                            <div className="space-y-3 h-[200px] overflow-y-auto mb-3 bg-black/20 p-2 rounded">
                              {currentTournamentMessages.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No announcements yet</p>
                              ) : (
                                currentTournamentMessages.map((msg: any) => (
                                  <div key={msg.id} className={`p-2 rounded text-sm ${msg.isAnnouncement ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : 'bg-muted'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                      <span className="font-bold text-indigo-400">{msg.senderGamertag}</span>
                                      <span className="text-[10px] text-muted-foreground">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                                    </div>
                                    <p className="whitespace-pre-wrap">{msg.message}</p>
                                  </div>
                                ))
                              )}
                            </div>
                            {(isCreator || isAdmin) && (
                              <div className="flex gap-2">
                                <Input 
                                  value={announcement}
                                  onChange={(e) => setAnnouncement(e.target.value)}
                                  placeholder="Post ID/Password or details..."
                                  className="text-sm"
                                />
                                <Button 
                                  size="icon" 
                                  disabled={!announcement || sendAnnouncementMutation.isPending}
                                  onClick={() => sendAnnouncementMutation.mutate({ id: tournament.id, message: announcement })}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </Card>

                          {/* Participants Details (For Host) */}
                          <Card className="p-4 border-muted">
                            <h4 className="font-semibold flex items-center gap-2 mb-3">
                              <Users className="h-4 w-4" />
                              Registered Players
                            </h4>
                            <div className="space-y-2 h-[240px] overflow-y-auto pr-2">
                              <TournamentParticipantsList tournamentId={tournament.id} isHost={isCreator || isAdmin} />
                            </div>
                          </Card>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ... Completed Tournaments section remains same but needs to use cards grid */}


          {/* Completed Tournaments */}
          {completedTournaments.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Completed</h2>
              <div className="grid gap-4">
                {completedTournaments.map((tournament: any) => (
                  <Card key={tournament.id} className="p-4" data-testid={`card-completed-tournament-${tournament.id}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold" data-testid={`text-completed-tournament-${tournament.id}`}>{tournament.name}</h3>
                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                          <span>{tournament.gameName}</span>
                          <span className="flex items-center gap-1">
                            <Coins className="h-4 w-4" />
                            {tournament.prizePool} credits distributed
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline">Completed</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {tournaments.length === 0 && (
            <Card className="p-8 text-center">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No tournaments yet. Create the first one or check back soon!</p>
              <Button 
                onClick={() => setIsCreateOpen(true)} 
                disabled={isLocked} 
                data-testid="button-create-first-tournament"
                className={isLocked ? "opacity-100" : ""}
              >
                {isLocked && <Lock className="h-4 w-4 mr-2 opacity-100" />}
                Create Tournament
              </Button>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
