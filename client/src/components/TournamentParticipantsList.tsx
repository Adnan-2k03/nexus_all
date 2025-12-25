import { useQuery, useMutation } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TournamentParticipantsListProps {
  tournamentId: string;
  isHost?: boolean;
  onParticipantsChange?: () => void;
}

export function TournamentParticipantsList({ tournamentId, isHost, onParticipantsChange }: TournamentParticipantsListProps) {
  const { toast } = useToast();
  const { data: participants = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/tournaments", tournamentId, "participants"],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/tournaments/${tournamentId}/participants`), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch participants");
      return res.json();
    },
    refetchInterval: 2000,
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async (participantId: string) => {
      const res = await fetch(getApiUrl(`/api/tournaments/${tournamentId}/participants/${participantId}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to remove participant");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournamentId, "participants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      if (onParticipantsChange) onParticipantsChange();
      toast({ title: "Success", description: "Participant removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading participants...</div>;
  }

  if (participants.length === 0) {
    return <p className="text-sm text-muted-foreground">No participants yet</p>;
  }

  return (
    <div className="space-y-2">
      {participants.map((participant: any) => {
        const inGameName = participant.gameDetails?.inGameName || "Unknown";
        const inGameId = participant.gameDetails?.inGameId || "N/A";
        return (
          <div
            key={participant.id}
            className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded text-sm"
            data-testid={`participant-${participant.id}`}
          >
            <div>
              <p className="font-medium" data-testid={`text-participant-name-${participant.id}`}>
                {inGameName}
              </p>
              <p className="text-xs text-muted-foreground" data-testid={`text-participant-id-${participant.id}`}>
                {inGameId}
              </p>
            </div>
            {isHost && (
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-6 w-6" 
                onClick={() => removeParticipantMutation.mutate(participant.id)}
                disabled={removeParticipantMutation.isPending}
                data-testid={`button-remove-participant-${participant.id}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
