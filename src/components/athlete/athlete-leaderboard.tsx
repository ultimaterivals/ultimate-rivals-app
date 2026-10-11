import { ArrowDown, ArrowUp, Minus, Shield, UserRound } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type AthleteLeaderboardRow = {
  id: string;
  entityId: string;
  displayName: string;
  avatarUrl: string | null;
  position: number | null;
  positionChange: number | null;
  points: number;
  byline: string;
};

function Avatar({ row }: { row: AthleteLeaderboardRow }) {
  return (
    <span
      className={cn(
        "relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-zinc-900",
        row.position === 1 ? "border-ur-gold" : "border-white/15",
      )}
      aria-label={`Perfil de ${row.displayName}`}
    >
      {row.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatar domains are supplied by published athlete profiles.
        <img src={row.avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        <UserRound size={19} aria-hidden="true" />
      )}
      {row.position && row.position <= 3 ? (
        <span className="bg-ur-gold text-ur-black absolute -right-0.5 -bottom-0.5 grid size-5 place-items-center rounded-full text-[.65rem] font-black">
          {row.position}
        </span>
      ) : null}
    </span>
  );
}

export function AthleteLeaderboard({
  rows,
  currentAthleteId,
  title,
  eyebrow,
}: {
  rows: AthleteLeaderboardRow[];
  currentAthleteId: string;
  title: string;
  eyebrow: string;
}) {
  const podium = rows.slice(0, 3);

  return (
    <section
      aria-labelledby="leaderboard-title"
      className="athlete-panel overflow-hidden"
    >
      <div className="athlete-stage athlete-stage-flat border-b border-white/10 px-5 py-6 sm:px-7">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-ur-gold text-xs font-black tracking-[.2em] uppercase">
              {eyebrow}
            </p>
            <h2
              id="leaderboard-title"
              className="font-display mt-1 text-3xl font-black uppercase sm:text-4xl"
            >
              {title}
            </h2>
          </div>
          <Image
            src="/brand/ur-logo-official.png"
            alt=""
            width={64}
            height={64}
            className="size-12 rounded-xl bg-[#f1eee4] p-1 opacity-95 sm:size-14"
          />
        </div>

        <div className="mt-7 grid grid-cols-3 items-end gap-2 sm:gap-4">
          {[podium[1], podium[0], podium[2]].map((row, visualIndex) =>
            row ? (
              <div
                key={row.id}
                className={cn(
                  "rounded-2xl border bg-black/35 p-3 text-center sm:p-4",
                  visualIndex === 1
                    ? "border-ur-gold/60 pb-6 sm:pb-8"
                    : "border-white/10",
                )}
              >
                <div className="flex justify-center">
                  <Avatar row={row} />
                </div>
                <p className="mt-3 truncate text-xs font-black sm:text-sm">
                  {row.displayName}
                </p>
                <p className="text-ur-gold mt-1 text-xs font-black">
                  {row.points} pts
                </p>
              </div>
            ) : (
              <div key={`empty-${visualIndex}`} />
            ),
          )}
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {rows.map((row) => {
          const hasMovement = typeof row.positionChange === "number";
          const change = row.positionChange ?? 0;
          const MovementIcon =
            change > 0 ? ArrowUp : change < 0 ? ArrowDown : Minus;
          const isCurrent = row.entityId === currentAthleteId;

          return (
            <div
              key={row.id}
              className={cn(
                "grid grid-cols-[2.25rem_3rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 sm:grid-cols-[2.75rem_3rem_minmax(0,1fr)_auto] sm:px-6",
                isCurrent && "bg-ur-gold/7 inset-shadow-[3px_0_0_#f4c430]",
              )}
            >
              <span className="font-display text-ur-gold text-center text-lg font-black">
                {row.position ? `#${row.position}` : "—"}
              </span>
              <Avatar row={row} />
              <div className="min-w-0">
                <p className="truncate font-black">
                  {row.displayName}
                  {isCurrent ? " · você" : ""}
                </p>
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  {row.byline || "Classificação oficial"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-ur-gold font-black">
                  {row.points} pts
                </p>
                {hasMovement ? (
                  <p className="mt-0.5 flex items-center justify-end gap-1 text-[.68rem] font-bold text-zinc-500">
                    <MovementIcon size={12} aria-hidden="true" />
                    {change === 0 ? "estável" : Math.abs(change)}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 border-t border-white/10 px-5 py-4 text-xs text-zinc-500">
        <Shield size={14} className="text-ur-gold" aria-hidden="true" />
        Somente resultados homologados entram nesta classificação.
      </div>
    </section>
  );
}
