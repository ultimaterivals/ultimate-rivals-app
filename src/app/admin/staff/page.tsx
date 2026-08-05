import { ClipboardCheck, ShieldCheck, UserRound } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { listStaffOperations } from "@/server/repositories/staff.repository";

const categoryLabel: Record<string, string> = {
  coaching: "Treino",
  media: "Mídia",
  officiating: "Arbitragem",
  operations: "Operação",
  technical: "Técnico",
};

export default async function AdminStaffPage() {
  const supabase = await createClient();
  const { roles, staff, officials } = await listStaffOperations(supabase);
  const formalRoles = roles.filter((role) => role.formal_officiating).length;
  const assignedOfficials = officials.filter((row) => row.profile_id).length;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Setor técnico"
        title="Staff e arbitragem"
        description="Catálogo operacional de papéis, acúmulo de funções por pessoa e vínculos de árbitro/scorer/coordenador por partida ou quadra."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Papéis ativos"
          value={String(roles.length)}
          hint="Sem folha salarial"
          icon={UserRound}
        />
        <StatCard
          label="Arbitragem formal"
          value={String(formalRoles)}
          hint="Referee + assistant"
          icon={ShieldCheck}
        />
        <StatCard
          label="Oficiais alocados"
          value={String(assignedOfficials)}
          hint="Partidas/courts"
          icon={ClipboardCheck}
        />
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <Card>
          <h2 className="font-display text-xl font-black uppercase">
            Papéis operacionais
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {roles.map((role) => (
              <div key={role.role} className="rounded-ur border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{role.label}</p>
                    <p className="mt-1 text-xs text-zinc-500">{role.role}</p>
                  </div>
                  <Badge>{categoryLabel[role.category] ?? role.category}</Badge>
                </div>
                {role.formal_officiating && (
                  <p className="mt-3 text-sm font-semibold text-emerald-300">
                    Papel de arbitragem formal
                  </p>
                )}
                {role.description && (
                  <p className="mt-3 text-sm text-zinc-400">
                    {role.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-xl font-black uppercase">
            Diretório de staff
          </h2>
          {staff.length ? (
            <div className="mt-4 divide-y">
              {staff.map((person) => (
                <div key={person.id} className="py-3">
                  <p className="font-bold">
                    {person.display_name ?? "Perfil sem nome"}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {person.label}{" "}
                    {person.pole_name ? `• ${person.pole_name}` : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nenhum staff atribuído"
              description="Cadastre papéis por pessoa para ativar escalas de sessão, treino, torneio, match e court."
            />
          )}
        </Card>
      </section>

      <Card>
        <h2 className="font-display text-xl font-black uppercase">
          Arbitragem e score por partida
        </h2>
        {officials.some((row) => row.profile_id) ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs tracking-wider text-zinc-500 uppercase">
                <tr>
                  <th className="py-2">Match</th>
                  <th>Escopo</th>
                  <th>Quadra</th>
                  <th>Oficial</th>
                  <th>Papel</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {officials
                  .filter((row) => row.profile_id)
                  .map((row) => (
                    <tr key={`${row.match_id}-${row.profile_id}-${row.role}`}>
                      <td className="py-3 font-bold">{row.match_code}</td>
                      <td>{row.match_scope}</td>
                      <td>{row.court_name ?? "—"}</td>
                      <td>{row.display_name ?? "—"}</td>
                      <td>{row.role}</td>
                      <td>
                        <Badge>{row.assignment_status}</Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Sem oficiais por partida"
            description="UR Play regular pode seguir self-officiated com coordenador; Series/Cup/Legends suportam árbitro formal, assistant referee e score operator por match/court."
          />
        )}
      </Card>
    </div>
  );
}
