import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { UserGameProfile } from "@shared/schema";

const SUPPORTED_GAMES = [
  { id: "INDUS_BR", label: "Indus Battle Royale" },
  { id: "FAUG", label: "FAUG" },
];

export function GameProfiles() {
  const { toast } = useToast();
  const [selectedGame, setSelectedGame] = useState<string>(SUPPORTED_GAMES[0].id);
  const [gameId, setGameId] = useState("");
  const [gameName, setGameName] = useState("");

  const { data: profiles = [], isLoading } = useQuery<UserGameProfile[]>({
    queryKey: ["/api/user/game-profiles"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { game: string; gameId: string; gameName: string }) =>
      apiRequest("POST", "/api/user/game-profiles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/game-profiles"] });
      setGameId("");
      setGameName("");
      toast({ title: "Game profile saved" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (game: string) =>
      apiRequest("DELETE", `/api/user/game-profiles/${game}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/game-profiles"] });
      toast({ title: "Game profile deleted" });
    },
  });

  const handleSaveProfile = () => {
    if (!gameId.trim() || !gameName.trim()) {
      toast({ title: "Please fill in all fields" });
      return;
    }
    createMutation.mutate({ game: selectedGame, gameId, gameName });
  };

  const existingProfile = profiles?.find((p: UserGameProfile) => p.game === selectedGame);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Game Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Game</label>
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              className="w-full mt-2 px-3 py-2 border rounded-md"
              data-testid="select-game-profile"
            >
              {SUPPORTED_GAMES.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">In-Game ID</label>
            <Input
              placeholder="Your game ID/username"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              data-testid="input-game-id"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Display Name</label>
            <Input
              placeholder="How you want to be called"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              data-testid="input-game-name"
            />
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={createMutation.isPending}
            data-testid="button-save-profile"
          >
            {existingProfile ? "Update Profile" : "Add Profile"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Game Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : profiles?.length === 0 ? (
            <p className="text-muted-foreground">No game profiles yet</p>
          ) : (
            <div className="space-y-3">
              {profiles?.map((profile: UserGameProfile) => (
                <div key={profile.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-semibold">
                      {SUPPORTED_GAMES.find((g) => g.id === profile.game)?.label}
                    </p>
                    <p className="text-sm text-muted-foreground">{profile.gameName} ({profile.gameId})</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(profile.game)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-profile-${profile.game}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
