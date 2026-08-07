import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAthleteProfile } from "@/server/repositories/athletes.repository";

const levels: Record<string, string> = {
  leveling: "Em Nivelamento",
  n3: "N3 Desenvolvimento",
  n2: "N2 Avançado",
  n1: "N1 Elite",
};

const hands: Record<string, string> = {
  left: "Esquerda",
  right: "Direita",
  ambidextrous: "Ambidestra",
};

const profileLinks = [
  ["Minha equipe", "/athlete/profile"],
  ["Desenvolvimento", "/athlete/development"],
  ["Jornada", "/athlete/journey"],
  ["Pontos", "/athlete/points"],
  ["Jogos", "/athlete/matches"],
  ["Configurações", "/athlete/profile/edit"],
] as const;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string }>;
}) {
  const query = await searchParams;
  const identity = await requireRole("athlete");
  const profile = await getAthleteProfile(
    await createClient(),
    identity.userId,
  );

  if (!profile)
    return (
      <EmptyState
        title="Cadastro esportivo não vinculado"
        description="A operação ainda precisa associar sua conta a um atleta."
      />
    );

  return (
    <div className="grid gap-6">
      {query.updated === "1" && (
        <p
          role="status"
          className="rounded-ur border-ur-gold text-ur-gold border p-3"
        >
          Perfil atualizado.
        </p>
      )}
      <section className="rounded-ur from-ur-panel overflow-hidden border bg-gradient-to-br via-black to-zinc-900 p-6 md:p-10">
        <div className="text-ur-gold text-sm font-bold tracking-[.25em]">
          {profile.athleteCode}
        </div>
        <PageHeader
          eyebrow="Atleta oficial"
          title={profile.publicName}
          description={
            profile.bio ??
            "Construindo sua trajetória no ecossistema Ultimate Rivals."
          }
        />
        <Link
          href="/athlete/profile/edit"
          className="rounded-ur bg-ur-gold mt-5 inline-block px-5 py-3 font-bold text-black"
        >
          Editar meu perfil
        </Link>
      </section>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Nível", profile.level ? levels[profile.level] : "Não atribuído"],
          ["Equipe", profile.team ?? "Sem equipe"],
          ["Polo", profile.pole ?? "Sem polo"],
          ["Status", profile.status],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-xs text-zinc-500 uppercase">{label}</p>
            <p className="mt-2 text-lg font-black">{value}</p>
          </Card>
        ))}
      </div>
      <Card>
        <h2 className="text-xl font-black">Minha equipe</h2>
        <p className="mt-3 text-2xl font-black">
          {profile.team ?? "Sem equipe"}
        </p>
        <p className="text-zinc-400">
          {profile.pole ?? "Sem polo"} ·{" "}
          {profile.membershipRole === "captain" ? "Capitão" : "Atleta"}
        </p>
      </Card>
      <Card className="border-ur-gold/40">
        <h2 className="text-xl font-black">Meu nível</h2>
        <p className="text-ur-gold mt-2 text-4xl font-black uppercase">
          {profile.level ?? "leveling"}
        </p>
        <Link
          href="/athlete/development"
          className="mt-3 inline-block font-bold"
        >
          Ver minha jornada →
        </Link>
      </Card>
      <Card>
        <h2 className="text-xl font-black">Formações atuais</h2>
        <div className="mt-3 grid gap-3">
          {profile.formations.length === 0 ? (
            <p className="text-zinc-500">Nenhuma formação ativa.</p>
          ) : (
            profile.formations.map((item) => (
              <div key={item.id} className="border-t pt-3">
                <p className="font-black">{item.name ?? item.format}</p>
                <p className="text-zinc-400">
                  {item.format} · {item.category} · {item.level.toUpperCase()}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
      <Card>
        <h2 className="text-xl font-black">Identidade esportiva</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <p>
            Altura:{" "}
            {profile.heightCm ? `${profile.heightCm} cm` : "Não informada"}
          </p>
          <p>
            Mão dominante:{" "}
            {profile.dominantHand
              ? hands[profile.dominantHand]
              : "Não informada"}
          </p>
        </div>
      </Card>
      <Card>
        <h2 className="text-xl font-black">Minha carreira</h2>
        <nav
          aria-label="Opções do perfil"
          className="mt-4 grid gap-2 sm:grid-cols-2"
        >
          {profileLinks.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="rounded-ur flex min-h-12 items-center justify-between border px-4 font-bold text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              {label}
              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </nav>
        <form action="/auth/signout" method="post" className="mt-3">
          <button className="min-h-11 cursor-pointer font-black text-zinc-400 hover:text-white">
            SAIR
          </button>
        </form>
      </Card>
    </div>
  );
}
