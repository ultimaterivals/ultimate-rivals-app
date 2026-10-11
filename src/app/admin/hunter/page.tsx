import { Card, PageHeader } from "@/components/ui";
import { requireAdminModule } from "@/lib/auth/admin-module-access";
import { createClient } from "@/lib/supabase/server";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function AdminHunterPage() {
  await requireAdminModule("hunter");
  const client = await createClient();
  const { data, error } = await client
    .from("athlete_hunter_interests")
    .select("athlete_id,created_at,athletes(public_name,athlete_code)")
    .order("created_at", { ascending: false })
    .limit(200);
  const interests = data ?? [];

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Esportivo"
        title="Interesse Hunter"
        description="Atletas que pediram contato sobre a Escola de Desenvolvimento UR. O registro de interesse não confirma entrada nem cria um plano."
      />
      {error ? (
        <Card>
          <p className="font-bold">Não foi possível carregar os interesses.</p>
        </Card>
      ) : interests.length === 0 ? (
        <Card>
          <p className="font-bold">Nenhum interesse registrado.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {interests.map((item) => {
            const athlete = item.athletes as unknown as {
              public_name: string;
              athlete_code: string;
            } | null;
            return (
              <Card
                key={item.athlete_id}
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="font-black">
                    {athlete?.public_name ?? "Atleta"}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {athlete?.athlete_code ?? item.athlete_id}
                  </p>
                </div>
                <p className="text-sm text-zinc-400">
                  {dateFormatter.format(new Date(item.created_at))}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
