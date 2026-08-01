import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAthleteProfile } from "@/server/repositories/athletes.repository";

const levelLabels: Record<string, string> = {
  leveling: "Em Nivelamento",
  n3: "Desenvolvimento",
  n2: "Avançado",
  n1: "Elite",
};
export default async function AthleteProfilePage() {
  const identity = await requireRole("athlete");
  const profile = await getAthleteProfile(
    await createClient(),
    identity.userId,
  );
  if (!profile)
    return (
      <div className="grid gap-8">
        <PageHeader eyebrow="Meu jogo" title="Perfil do atleta" />
        <EmptyState
          title="Cadastro esportivo não vinculado"
          description="Sua conta ainda não está vinculada a um cadastro de atleta."
        />
      </div>
    );
  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Meu jogo"
        title={profile.publicName}
        description="Nível e vínculo são somente leitura e administrados pela operação oficial."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-zinc-500 uppercase">Nível atual</p>
          <p className="mt-2 text-xl font-bold">
            {profile.level ? levelLabels[profile.level] : "Não atribuído"}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500 uppercase">Equipe ativa</p>
          <p className="mt-2 text-xl font-bold">
            {profile.team ?? "Sem equipe"}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500 uppercase">Polo oficial</p>
          <p className="mt-2 text-xl font-bold">{profile.pole ?? "Sem polo"}</p>
        </Card>
      </div>
    </div>
  );
}
