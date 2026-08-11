import type {
  AdminMediaSnapshot,
  MediaChannel,
  MediaDeliverable,
  MediaDeliverableStatus,
  MediaSession,
} from "@/features/admin-ur-play-media/types";
import { fetchAdminMediaRepositoryData } from "@/server/repositories/admin-ur-play-media-repository";

export const MEDIA_DELIVERABLES: Record<
  string,
  { label: string; description: string; sla: string }
> = {
  result_summary: {
    label: "Resultado / resumo final",
    description:
      "Publicar o resultado ou resumo oficial da sessão enquanto o evento ainda está quente.",
    sla: "Até 4h",
  },
  photo_carousel: {
    label: "Fotos da sessão",
    description:
      "Organizar e publicar o conjunto principal de fotos e registros visuais da experiência.",
    sla: "Até 24h",
  },
  athlete_highlights: {
    label: "Destaques individuais",
    description:
      "Publicar atletas, jogadas ou reconhecimentos que sustentam a narrativa esportiva da rodada.",
    sla: "Até 24h",
  },
  best_moments: {
    label: "Melhores momentos",
    description:
      "Entregar Reel, vídeo ou corte com os momentos mais fortes da sessão.",
    sla: "Até 48h",
  },
  ranking_update: {
    label: "Ranking atualizado",
    description:
      "Comunicar a atualização de ranking produzida pelos dados esportivos homologados.",
    sla: "Até 48h",
  },
  next_event_announcement: {
    label: "Próxima oportunidade",
    description:
      "Anunciar a próxima sessão ou oportunidade da jornada. É continuidade comercial e não bloqueia o fechamento 360.",
    sla: "Até 7 dias",
  },
};

export async function getAdminMediaSnapshot(): Promise<AdminMediaSnapshot> {
  const generatedAt = new Date().toISOString();
  const raw = await fetchAdminMediaRepositoryData();
  const sessionMap = new Map(raw.sessions.map((row) => [row.id, row]));
  const closedSessions = new Set(
    raw.closures
      .filter((row) => row.status === "closed")
      .map((row) => row.session_id),
  );
  const deliverablesBySession = new Map<string, MediaDeliverable[]>();

  for (const row of raw.deliverables) {
    const definition = MEDIA_DELIVERABLES[row.deliverable_key] ?? {
      label: row.deliverable_key,
      description: "Entrega de mídia da sessão.",
      sla: "—",
    };
    const item: MediaDeliverable = {
      id: row.id,
      sessionId: row.session_id,
      key: row.deliverable_key,
      label: definition.label,
      description: definition.description,
      status: row.status as MediaDeliverableStatus,
      blocking: row.blocking,
      dueAt: row.due_at,
      channel: row.channel as MediaChannel | null,
      publicationUrl: row.publication_url,
      mediaAssetId: row.media_asset_id,
      notes: row.notes,
      publishedAt: row.published_at,
      waiverReason: row.waiver_reason,
    };
    deliverablesBySession.set(row.session_id, [
      ...(deliverablesBySession.get(row.session_id) ?? []),
      item,
    ]);
  }

  const now = new Date(generatedAt).getTime();
  const sessions: MediaSession[] = [...deliverablesBySession.entries()]
    .map(([sessionId, deliverables]) => {
      const session = sessionMap.get(sessionId);
      const blocking = deliverables.filter((item) => item.blocking);
      const unresolved = blocking.filter(
        (item) => !["published", "waived"].includes(item.status),
      );
      return {
        id: sessionId,
        name: session?.name ?? "UR Play",
        endsAt: session?.ends_at ?? deliverables[0]?.dueAt ?? generatedAt,
        closed: closedSessions.has(sessionId),
        deliverables,
        counts: {
          total: deliverables.length,
          blocking: blocking.length,
          published: deliverables.filter((item) => item.status === "published")
            .length,
          waived: deliverables.filter((item) => item.status === "waived")
            .length,
          pending: unresolved.length,
          overdue: unresolved.filter(
            (item) => new Date(item.dueAt).getTime() < now,
          ).length,
          ready: blocking.length === 5 && unresolved.length === 0,
        },
      };
    })
    .sort(
      (a, b) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime(),
    );

  const all = sessions.flatMap((session) => session.deliverables);
  const unresolved = all.filter(
    (item) => !["published", "waived"].includes(item.status),
  );

  return {
    generatedAt,
    sessions,
    metrics: {
      total: all.length,
      published: all.filter((item) => item.status === "published").length,
      pending: unresolved.length,
      overdue: unresolved.filter((item) => new Date(item.dueAt).getTime() < now)
        .length,
      readySessions: sessions.filter((session) => session.counts.ready).length,
    },
    sourceErrors: raw.errors,
  };
}
