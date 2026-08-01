import { Card, PageHeader } from "@/components/ui";
import { createUrPlaySessionAction } from "@/features/ur-play/actions";
import { createClient } from "@/lib/supabase/server";
export default async function Page() {
  const c = await createClient(),
    [
      { data: seasons },
      { data: cycles },
      { data: poles },
      { data: venues },
      { data: courts },
      { data: formats },
      { data: categories },
    ] = await Promise.all([
      c.from("seasons").select("id,name"),
      c.from("season_cycles").select("id,name"),
      c.from("poles").select("id,name"),
      c.from("venues").select("id,name"),
      c.from("courts").select("id,name"),
      c.from("competitive_formats").select("id,name"),
      c.from("competitive_categories").select("id,name"),
    ]);
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="UR Play" title="Criar sessão" />
      <Card>
        <form
          action={createUrPlaySessionAction}
          className="grid gap-3 md:grid-cols-3"
        >
          <input
            name="name"
            required
            placeholder="Nome da sessão"
            className="rounded-ur border bg-black p-3"
          />
          <select
            name="seasonId"
            aria-label="Temporada"
            className="rounded-ur border bg-black p-3"
          >
            {seasons?.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          <select
            name="seasonCycleId"
            aria-label="Ciclo"
            className="rounded-ur border bg-black p-3"
          >
            <option value="">Sem ciclo</option>
            {cycles?.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          <select
            name="poleId"
            aria-label="Polo"
            className="rounded-ur border bg-black p-3"
          >
            {poles?.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          <select
            name="venueId"
            aria-label="Venue"
            className="rounded-ur border bg-black p-3"
          >
            {venues?.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          <select
            multiple
            name="courtIds"
            aria-label="Quadras"
            className="rounded-ur border bg-black p-3"
          >
            {courts?.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          <input
            name="sessionDate"
            type="date"
            aria-label="Data"
            required
            className="rounded-ur border bg-black p-3"
          />
          <input
            name="startsAt"
            type="datetime-local"
            aria-label="Início"
            required
            className="rounded-ur border bg-black p-3"
          />
          <input
            name="endsAt"
            type="datetime-local"
            aria-label="Fim"
            required
            className="rounded-ur border bg-black p-3"
          />
          <input
            name="registrationOpensAt"
            type="datetime-local"
            aria-label="Abertura inscrições"
            className="rounded-ur border bg-black p-3"
          />
          <input
            name="registrationClosesAt"
            type="datetime-local"
            aria-label="Fechamento inscrições"
            className="rounded-ur border bg-black p-3"
          />
          <input
            name="checkinOpensAt"
            type="datetime-local"
            aria-label="Abertura check-in"
            className="rounded-ur border bg-black p-3"
          />
          <input
            name="checkinClosesAt"
            type="datetime-local"
            aria-label="Fechamento check-in"
            className="rounded-ur border bg-black p-3"
          />
          <input
            name="capacity"
            type="number"
            defaultValue="16"
            aria-label="Capacidade"
            className="rounded-ur border bg-black p-3"
          />
          <input
            name="waitlistCapacity"
            type="number"
            defaultValue="8"
            aria-label="Lista de espera"
            className="rounded-ur border bg-black p-3"
          />
          <input
            name="priceAmount"
            type="number"
            step="0.01"
            aria-label="Valor"
            className="rounded-ur border bg-black p-3"
          />
          <select
            name="formatId"
            aria-label="Formato"
            className="rounded-ur border bg-black p-3"
          >
            <option value="">Todos</option>
            {formats?.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          <select
            name="categoryId"
            aria-label="Categoria"
            className="rounded-ur border bg-black p-3"
          >
            <option value="">Todas</option>
            {categories?.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          <select
            name="level"
            aria-label="Nível"
            className="rounded-ur border bg-black p-3"
          >
            <option value="">Todos</option>
            <option value="leveling">Nivelamento</option>
            <option value="n3">N3</option>
            <option value="n2">N2</option>
            <option value="n1">N1</option>
          </select>
          <textarea
            name="notes"
            placeholder="Notas"
            className="rounded-ur border bg-black p-3"
          />
          <button className="rounded-ur bg-ur-gold px-5 py-3 font-black text-black">
            Criar sessão
          </button>
        </form>
      </Card>
    </div>
  );
}
