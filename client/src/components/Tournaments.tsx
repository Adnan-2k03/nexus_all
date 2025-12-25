import { useState, useMemo, useEffect } from "react";
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
import { Trophy, Users, Calendar, Coins, Lock, MessageSquare, Send, RefreshCw, Edit2, Trash2, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DailyRewards } from "./DailyRewards";
import { TournamentParticipantsList } from "./TournamentParticipantsList";

interface TournamentsProps {
  currentUserId?: string;
  isAdmin?: boolean;
}

export function Tournaments({ currentUserId, isAdmin }: TournamentsProps) {
  const [, setLocation] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [gameId, setGameId] = useState("");
  const [gameUsername, setGameUsername] = useState("");
  const [saveProfile, setSaveProfile] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const [query, setQuery] = useState("");
  const [expandedTournament, setExpandedTournament] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [teammateIds, setTeammateIds] = useState<string[]>([]);
  const [roadmapFile, setRoadmapFile] = useState<File | null>(null);
  const { toast } = useToast();

  const { data: invitations = [] } = useQuery<any[]>({
    queryKey: ["/api/tournaments/invitations"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/tournaments/invitations"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch invitations");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const { data: teamLayouts = [] } = useQuery<any[]>({
    queryKey: ["/api/team-layouts"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/team-layouts"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch layouts");
      return res.json();
    },
  });

  const { data: matchHistory = [] } = useQuery<any[]>({
    queryKey: ["/api/match-history"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/match-history"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
  });

  const { data: user = { id: "", gamertag: "", coins: 0, gameProfiles: {} } } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const { data: messages = [] } = useQuery<any[]>({
    queryKey: ["/api/tournaments", expandedTournament, "messages"],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/tournaments/${expandedTournament}/messages`), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!expandedTournament,
    refetchInterval: 2000,
  });

  const { data: participants = [] } = useQuery<any[]>({
    queryKey: ["/api/tournaments", expandedTournament, "participants"],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/tournaments/${expandedTournament}/participants`), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch participants");
      return res.json();
    },
    enabled: !!expandedTournament,
    refetchInterval: 2000,
  });

  // Re-fetch tournaments when participants change to update counts
  useEffect(() => {
    if (expandedTournament) {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
    }
  }, [participants.length, expandedTournament]);

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
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", expandedTournament, "participants"] });
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

  const form = useForm({
    resolver: zodResolver(insertTournamentSchema),
    defaultValues: {
      name: "",
      gameName: "",
      prizePool: 100,
      entryFee: 0,
      maxParticipants: 16,
      startTime: "",
      playersPerTeam: 1,
      description: "",
    },
  });

  const { data: tournaments = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/tournaments"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/tournaments"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tournaments");
      return res.json();
    },
  });

  const { data: userTournaments = [] } = useQuery<any[]>({
    queryKey: ["/api/user/tournaments", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const res = await fetch(getApiUrl(`/api/user/${currentUserId}/tournaments`), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user tournaments");
      return res.json();
    },
    enabled: !!currentUserId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const isEditing = !!selectedTournament?.id && isCreateOpen;
      const url = isEditing ? `/api/tournaments/${selectedTournament.id}` : "/api/tournaments";
      const method = isEditing ? "PATCH" : "POST";
      
      const res = await fetch(getApiUrl(url), {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`Failed to ${isEditing ? 'update' : 'create'} tournament`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/tournaments"] });
      setIsCreateOpen(false);
      setSelectedTournament(null);
      form.reset();
      toast({
        title: "Success",
        description: `Tournament ${selectedTournament ? 'updated' : 'created'} successfully!`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (tournamentId: string) => {
      const res = await fetch(getApiUrl(`/api/tournaments/${tournamentId}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete tournament");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/tournaments"] });
      setExpandedTournament(null);
      toast({
        title: "Success",
        description: "Tournament deleted!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete tournament",
        variant: "destructive",
      });
    },
  });

  const activeTournaments = useMemo(() => {
    if (!Array.isArray(tournaments)) return [];
    return tournaments.filter((t: any) => t.status !== "completed");
  }, [tournaments]);

  const completedTournaments = useMemo(() => {
    if (!Array.isArray(tournaments)) return [];
    return tournaments.filter((t: any) => t.status === "completed");
  }, [tournaments]);

  const handleCreateTournament = async (data: any) => {
    const dataToSubmit = { ...data };
    if (roadmapFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        dataToSubmit.roadmapImageUrl = reader.result as string;
        createMutation.mutate(dataToSubmit);
      };
      reader.readAsDataURL(roadmapFile);
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const handleJoinTournament = (tournament: any) => {
    setSelectedTournament(tournament);
    setIsRegisterOpen(true);
  };

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
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={async () => {
              setIsRefreshing(true);
              try {
                await queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
                if (expandedTournament) {
                  await queryClient.invalidateQueries({ queryKey: ["/api/tournaments", expandedTournament, "messages"] });
                  await queryClient.invalidateQueries({ queryKey: ["/api/tournaments", expandedTournament, "participants"] });
                }
                await new Promise(resolve => setTimeout(resolve, 500));
              } finally {
                setIsRefreshing(false);
              }
            }}
            data-testid="button-refresh-tournaments"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing || isLoading ? "animate-spin" : ""}`} />
          </Button>
          {isAdmin && (
            <Dialog open={isCreateOpen} onOpenChange={(open) => {
              setIsCreateOpen(open);
              if (!open) {
                setSelectedTournament(null);
                setRoadmapFile(null);
                form.reset({
                  name: "",
                  gameName: "",
                  prizePool: 100,
                  entryFee: 0,
                  maxParticipants: 16,
                  startTime: "",
                  playersPerTeam: 1,
                  description: "",
                });
              }
            }}>
              <DialogTrigger asChild>
              <Button 
                disabled={isLocked} 
                data-testid="button-create-tournament"
                onClick={() => setSelectedTournament(null)}
              >
                {isLocked && <Lock className="h-4 w-4 mr-2" />}
                Create Tournament
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedTournament ? "Edit Tournament" : "Create New Tournament"}</DialogTitle>
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
                        <Input type="number" placeholder="100" data-testid="input-prize-pool" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="entryFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entry Fee (Coins)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" data-testid="input-entry-fee" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date & Time</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local" 
                            data-testid="input-start-time" 
                            {...field} 
                            value={
                              field.value 
                                ? (typeof field.value === 'string' 
                                    ? field.value 
                                    : new Date(field.value).toISOString().slice(0, 16)) 
                                : ""
                            } 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="playersPerTeam"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Players Per Team</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="1" data-testid="input-players-per-team" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="maxParticipants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Participants</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="16" data-testid="input-max-participants" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Rules, map info, etc." data-testid="input-tournament-description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel>Tournament Roadmap Photo</FormLabel>
                  <FormControl>
                    <Input 
                      type="file" 
                      accept="image/*" 
                      data-testid="input-roadmap-photo"
                      onChange={(e) => setRoadmapFile(e.target.files?.[0] || null)}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">Upload a roadmap or bracket image for this tournament</p>
                  <FormMessage />
                </FormItem>
                <Button type="submit" className="w-full" disabled={createMutation.isPending || isLocked} data-testid="button-submit-tournament">
                  {createMutation.isPending ? "Saving..." : (selectedTournament ? "Update Tournament" : "Create Tournament")}
                </Button>
              </form>
            </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tournament Registration</DialogTitle>
          </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedTournament?.description && (
                <div className="p-3 bg-muted rounded-md text-sm italic">
                  <p className="font-semibold not-italic mb-1">Host Instructions:</p>
                  {selectedTournament.description}
                </div>
              )}
              <div className="p-3 bg-indigo-500/10 rounded-md border border-indigo-500/20 text-sm">
                <p className="font-semibold text-indigo-400">Entry Fee: {selectedTournament?.entryFee || 0} Coins</p>
                <p className="text-muted-foreground mt-1">Your Balance: {user?.coins || 0} Coins</p>
              </div>
              
              {selectedTournament?.playersPerTeam > 1 && (
                <div className="space-y-3 p-3 bg-secondary/50 rounded-md">
                  <p className="text-sm font-semibold">Team Registration ({selectedTournament.playersPerTeam} Members)</p>
                  {Array.from({ length: selectedTournament.playersPerTeam - 1 }).map((_, i) => (
                    <div key={i} className="space-y-1">
                      <label className="text-xs text-muted-foreground">Teammate {i + 1} NexusMatch ID</label>
                      <Input 
                        placeholder="Enter teammate's ID"
                        value={teammateIds[i] || ""}
                        onChange={(e) => {
                          const newIds = [...teammateIds];
                          newIds[i] = e.target.value;
                          setTeammateIds(newIds);
                        }}
                      />
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground italic">Registration will be "Pending" until all teammates accept.</p>
                </div>
              )}
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
              disabled={joinWithCoinsMutation.isPending || !gameUsername || !gameId || (selectedTournament?.playersPerTeam > 1 && teammateIds.length !== selectedTournament.playersPerTeam - 1)}
              onClick={() => joinWithCoinsMutation.mutate({ inGameName: gameUsername, inGameId: gameId, saveProfile, teammateIds })}
            >
              {joinWithCoinsMutation.isPending ? "Registering..." : (selectedTournament?.playersPerTeam > 1 ? "Invite Team & Register" : "Confirm Registration")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="tournaments" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
          <TabsTrigger value="history">Match History</TabsTrigger>
        </TabsList>
        <TabsContent value="tournaments" className="space-y-6 mt-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <>
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
                                  <h3 className="font-bold text-lg">{tournament.name}</h3>
                                  <Badge variant={tournament.status === "active" ? "default" : "secondary"}>{tournament.status}</Badge>
                                  {isCreator && <Badge variant="outline">Host</Badge>}
                                </div>
                                {tournament.description && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{tournament.description}</p>
                                )}
                                <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <span>{tournament.gameName}</span>
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Coins className="h-4 w-4 text-yellow-500" />
                                    {tournament.prizePool} pool
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Lock className="h-4 w-4 text-orange-500" />
                                    {tournament.entryFee} fee
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    {tournament.participantCount !== undefined ? tournament.participantCount : (tournament.participants?.length || 0)}/{tournament.maxParticipants} ({tournament.playersPerTeam}/team)
                                  </span>
                                  {tournament.startTime && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-4 w-4" />
                                      {new Date(tournament.startTime).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2 items-center flex-wrap">
                                {!isCreator && !isJoined && !isAdmin && (
                                  <Button 
                                    onClick={(e) => { e.stopPropagation(); handleJoinTournament(tournament); }} 
                                    disabled={joinWithCoinsMutation.isPending || isLocked} 
                                  >
                                    Join
                                  </Button>
                                )}
                                {isJoined && <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/20">Joined</Badge>}
                                <Button 
                                  size="icon" 
                                  variant="outline"
                                  onClick={(e) => { e.stopPropagation(); setLocation(`/tournaments/${tournament.id}/players`); }}
                                  data-testid="button-view-players"
                                  title="View all registered players"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {(isCreator || isAdmin) && (
                                  <div className="flex gap-2">
                                    <Button 
                                      size="icon" 
                                      variant="ghost"
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setSelectedTournament(tournament);
                                        form.reset({
                                          name: tournament.name,
                                          gameName: tournament.gameName,
                                          prizePool: tournament.prizePool,
                                          entryFee: tournament.entryFee,
                                          maxParticipants: tournament.maxParticipants,
                                          startTime: tournament.startTime,
                                          playersPerTeam: tournament.playersPerTeam,
                                          description: tournament.description,
                                        });
                                        setIsCreateOpen(true);
                                      }}
                                      data-testid="button-edit-tournament"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      size="icon" 
                                      variant="ghost"
                                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(tournament.id); }}
                                      disabled={deleteMutation.isPending}
                                      data-testid="button-delete-tournament"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </Card>

                          {isExpanded && (
                            <div className="grid md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                              <Card className="p-4 border-indigo-500/20">
                                <h4 className="font-semibold flex items-center gap-2 mb-3">
                                  <MessageSquare className="h-4 w-4 text-indigo-400" />
                                  Announcements
                                </h4>
                                <div className="space-y-3 h-[200px] overflow-y-auto mb-3 bg-black/20 p-2 rounded">
                                  {messages.filter((m: any) => m.isAnnouncement).length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-8">No announcements yet</p>
                                  ) : (
                                    messages.filter((m: any) => m.isAnnouncement).map((msg: any) => (
                                      <div key={msg.id} className="p-2 rounded text-sm bg-indigo-500/10 border-l-2 border-indigo-500">
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
                                      placeholder="Post announcement..."
                                      className="text-sm h-9"
                                    />
                                    <Button 
                                      size="icon" 
                                      className="shrink-0 h-9 w-9"
                                      disabled={sendAnnouncementMutation.isPending || !announcement.trim()}
                                      onClick={() => sendAnnouncementMutation.mutate({ id: tournament.id, message: announcement })}
                                    >
                                      <Send className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </Card>

                              <Card className="p-4 border-muted">
                                <h4 className="font-semibold flex items-center gap-2 mb-3">
                                  <Users className="h-4 w-4" />
                                  Queries
                                </h4>
                                <div className="space-y-3 h-[200px] overflow-y-auto mb-3 bg-black/20 p-2 rounded">
                                  {messages.filter((m: any) => !m.isAnnouncement).length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-8">No messages yet</p>
                                  ) : (
                                    messages.filter((m: any) => !m.isAnnouncement).map((msg: any) => (
                                      <div key={msg.id} className="p-2 rounded text-sm bg-muted/50">
                                        <div className="flex justify-between items-start mb-1">
                                          <span className="font-semibold">{msg.senderGamertag}</span>
                                          <span className="text-[10px] text-muted-foreground">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                                        </div>
                                        <p className="whitespace-pre-wrap">{msg.message}</p>
                                      </div>
                                    ))
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Input 
                                    placeholder="Ask a question..."
                                    className="text-sm h-9"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                        sendAnnouncementMutation.mutate({ id: tournament.id, message: e.currentTarget.value });
                                        e.currentTarget.value = '';
                                      }
                                    }}
                                  />
                                  <Button 
                                    size="icon" 
                                    className="shrink-0 h-9 w-9"
                                    disabled={sendAnnouncementMutation.isPending}
                                    onClick={(e) => {
                                      const input = (e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement);
                                      if (input && input.value.trim()) {
                                        sendAnnouncementMutation.mutate({ id: tournament.id, message: input.value });
                                        input.value = '';
                                      }
                                    }}
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
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

              {completedTournaments.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold opacity-60">Past Tournaments</h2>
                  <div className="grid gap-4 opacity-75">
                    {completedTournaments.map((tournament: any) => (
                      <Card key={tournament.id} className="p-4 grayscale">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold">{tournament.name}</h3>
                            <p className="text-sm text-muted-foreground">{tournament.gameName} • {tournament.prizePool} pool</p>
                          </div>
                          <Badge variant="outline">Completed</Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Match History</h2>
            {matchHistory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No matches played yet. Join a tournament to start your history!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {matchHistory.map((item: any) => (
                  <Card key={item.id} className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">{item.tournamentName}</h3>
                      <p className="text-sm text-muted-foreground">{new Date(item.date).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="outline" className="text-indigo-400 border-indigo-500/30">
                      {item.highestRound}
                    </Badge>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
