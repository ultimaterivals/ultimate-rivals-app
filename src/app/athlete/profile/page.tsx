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
    </div>
  );
}
