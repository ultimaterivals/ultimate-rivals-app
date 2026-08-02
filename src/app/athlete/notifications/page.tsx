import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/athlete-experience/notification-actions";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAthleteId } from "@/server/services/athlete-experience.service";

export default async function AthleteNotificationsPage() {
  const identity = await requireRole("athlete");
  const client = await createClient();
  const athleteId = await getAthleteId(client, identity.userId);
  if (!athleteId) notFound();
  const { data, error } = await client
    .from("notifications")
    .select("id,title,body,action_href,occurred_at,read_at,notification_type")
    .eq("athlete_id", athleteId)
    .order("occurred_at", { ascending: false })
    .limit(50);
  if (error)
    throw new Error("NÃ£o foi possÃ­vel carregar suas notificaÃ§Ãµes.");
  const fresh = (data ?? []).filter((item) => !item.read_at);
  const previous = (data ?? []).filter((item) => item.read_at);
  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <PageHeader
        eyebrow="Inbox interna"
        title="NotificaÃ§Ãµes"
        description="Chamadas e acontecimentos esportivos que pedem sua atenÃ§Ã£o."
        action={
          fresh.length ? (
            <form action={markAllNotificationsRead}>
              <button className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm font-black hover:border-zinc-500">
                <CheckCheck size={18} /> MARCAR TODAS COMO LIDAS
              </button>
            </form>
          ) : undefined
        }
      />
      {data?.length ? (
        <>
          <NotificationSection title="Novas" rows={fresh} />
          <NotificationSection title="Anteriores" rows={previous} />
        </>
      ) : (
        <EmptyState
          title="Tudo em dia"
          description="Novas chamadas, resultados e mudanÃ§as no ranking aparecerÃ£o aqui."
        />
      )}
    </div>
  );
}

function NotificationSection({
  title,
  rows,
}: {
  title: string;
  rows: {
    id: string;
    title: string;
    body: string;
    action_href: string;
    occurred_at: string;
    read_at: string | null;
  }[];
}) {
  if (!rows.length) return null;
  return (
    <section>
      <h2 className="mb-3 text-sm font-black tracking-[.16em] text-zinc-500 uppercase">
        {title}
      </h2>
      <div className="grid gap-2">
        {rows.map((item) => (
          <Card
            key={item.id}
            className={!item.read_at ? "border-ur-gold/40" : "opacity-80"}
          >
            <div className="flex gap-4">
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-full ${item.read_at ? "bg-zinc-800 text-zinc-500" : "bg-ur-gold/10 text-ur-gold"}`}
              >
                <Bell size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <strong>{item.title}</strong>
                  <time className="text-xs text-zinc-500">
                    {new Date(item.occurred_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </time>
                </div>
                <p className="mt-1 text-sm text-zinc-400">{item.body}</p>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <Link
                    href={item.action_href}
                    className="text-ur-gold inline-flex min-h-11 items-center text-sm font-black"
                  >
                    ABRIR CONTEXTO
                  </Link>
                  {!item.read_at && (
                    <form action={markNotificationRead}>
                      <input
                        type="hidden"
                        name="notificationId"
                        value={item.id}
                      />
                      <button className="min-h-11 cursor-pointer text-sm font-black text-zinc-400 hover:text-white">
                        MARCAR COMO LIDA
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
