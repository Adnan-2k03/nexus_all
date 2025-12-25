import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface TournamentParticipantsListProps {
  tournamentId: string;
  isHost?: boolean;
}

export function TournamentParticipantsList({ tournamentId, isHost }: TournamentParticipantsListProps) {
  const { data: participants = [], isLoading } = useQuery({
    queryKey: ["/api/tournaments", tournamentId, "participants"],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/tournaments/${tournamentId}/participants`), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch participants");
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading participants...</div>;
  }

  if (participants.length === 0) {
    return <p className="text-sm text-muted-foreground">No participants yet</p>;
  }

  return (
    <div className="space-y-2">
      {participants.map((participant: any) => (
        <div
          key={participant.id}
          className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded text-sm"
          data-testid={`participant-${participant.id}`}
        >
          <div>
            <p className="font-medium" data-testid={`text-participant-name-${participant.id}`}>
              {participant.inGameName}
            </p>
            <p className="text-xs text-muted-foreground" data-testid={`text-participant-id-${participant.id}`}>
              {participant.inGameId}
            </p>
          </div>
          {isHost && (
            <Button size="icon" variant="ghost" className="h-6 w-6" data-testid={`button-remove-participant-${participant.id}`}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
