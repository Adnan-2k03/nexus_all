import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { getApiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users } from "lucide-react";

export function TournamentPlayersPage() {
  const [match, params] = useRoute("/tournaments/:id/players");
  const tournamentId = params?.id as string;

  const { data: tournament, isLoading: tournamentLoading } = useQuery<any>({
    queryKey: ["/api/tournaments", tournamentId],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/tournaments/${tournamentId}`), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch tournament");
      return res.json();
    },
    enabled: !!tournamentId,
  });

  const { data: participants = [], isLoading: participantsLoading } = useQuery<any[]>({
    queryKey: ["/api/tournaments", tournamentId, "participants"],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/tournaments/${tournamentId}/participants`), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch participants");
      return res.json();
    },
    enabled: !!tournamentId,
  });

  if (tournamentLoading || participantsLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/tournaments">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/tournaments">
          <Button variant="ghost" size="icon" data-testid="button-back-to-tournaments">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{tournament?.name || "Tournament"}</h1>
          <p className="text-muted-foreground">{tournament?.gameName}</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h2 className="text-2xl font-semibold">Registered Players</h2>
            <Badge variant="secondary">{participants.length}/{tournament?.maxParticipants}</Badge>
          </div>
        </div>

        {participants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No players registered yet</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {participants.map((participant: any) => {
              const inGameName = participant.gameDetails?.inGameName || "Unknown";
              const inGameId = participant.gameDetails?.inGameId || "N/A";
              return (
                <Card
                  key={participant.id}
                  className="p-4 border"
                  data-testid={`player-card-${participant.id}`}
                >
                  <div className="space-y-2">
                    <div>
                      <p className="font-semibold text-lg" data-testid={`text-player-name-${participant.id}`}>
                        {inGameName}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid={`text-player-id-${participant.id}`}>
                        ID: {inGameId}
                      </p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Badge variant="outline" className="text-xs">
                        {participant.gamertag || "Unknown"}
                      </Badge>
                      <Badge variant={participant.status === "registered" ? "default" : "secondary"} className="text-xs">
                        {participant.status}
                      </Badge>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      <div className="space-y-2 text-sm text-muted-foreground">
        <p>Tournament Info:</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold">Prize Pool</p>
            <p>{tournament?.prizePool} Credits</p>
          </div>
          <div>
            <p className="font-semibold">Entry Fee</p>
            <p>{tournament?.entryFee} Coins</p>
          </div>
          {tournament?.startTime && (
            <div>
              <p className="font-semibold">Start Time</p>
              <p>{new Date(tournament.startTime).toLocaleString()}</p>
            </div>
          )}
          <div>
            <p className="font-semibold">Players Per Team</p>
            <p>{tournament?.playersPerTeam}/team</p>
          </div>
        </div>
      </div>
    </div>
  );
}
