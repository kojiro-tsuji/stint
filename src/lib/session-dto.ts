import type { ActiveSession } from "@prisma/client";
import type { ActiveSessionDTO } from "@/types";

export function toSessionDTO(session: ActiveSession): ActiveSessionDTO {
  return {
    id: session.id,
    title: session.title,
    color: session.color,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt ? session.endedAt.toISOString() : null,
    syncAttempts: session.syncAttempts,
    syncError: session.syncError,
  };
}
