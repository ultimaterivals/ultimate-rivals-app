import { Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAthletePrivateView } from "@/server/repositories/athlete360.repository";
import { OwnAthleteForm } from "@/features/athletes/athlete-forms";
import { AvatarUpload } from "@/features/athletes/avatar-upload";
export default async function Page() {
  const identity = await requireRole("athlete");
  const client = await createClient();
  const { data: link } = await client
    .from("athletes")
    .select("id")
    .eq("profile_id", identity.userId)
    .single();
  const athlete = await getAthletePrivateView(client, link!.id);
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Meu perfil"
        title="Editar dados permitidos"
        description="Nível, equipe, status e código UR permanecem protegidos."
      />
      <Card>
        <OwnAthleteForm athlete={athlete} />
      </Card>
      <Card>
        <h2 className="mb-4 text-xl font-bold">Avatar</h2>
        <AvatarUpload athleteId={athlete.id} />
      </Card>
    </div>
  );
}
