import { PageHeader, Button, Input, Select } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getAthletePrivateView } from "@/server/repositories/athlete360.repository";
import { updateAthleteAdminAction } from "@/features/athletes/actions";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const a = await getAthletePrivateView(await createClient(), id);
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={a.athlete_code}
        title="Editar atleta"
        description="Código, nível e vínculos não são editáveis aqui."
      />
      <form
        action={updateAthleteAdminAction}
        className="rounded-ur bg-ur-graphite grid gap-4 border p-5 md:grid-cols-2"
      >
        <input type="hidden" name="athleteId" value={id} />
        <Input
          name="publicName"
          id="publicName"
          label="Nome público"
          defaultValue={a.public_name}
          required
        />
        <Input
          name="fullName"
          id="fullName"
          label="Nome completo"
          defaultValue={a.full_name}
          required
        />
        <Input
          name="birthDate"
          id="birthDate"
          type="date"
          label="Nascimento"
          defaultValue={a.birth_date ?? ""}
        />
        <Select
          name="gender"
          id="gender"
          label="Gênero"
          defaultValue={a.gender}
        >
          <option value="undisclosed">Não informado</option>
          <option value="female">Feminino</option>
          <option value="male">Masculino</option>
          <option value="non_binary">Não binário</option>
        </Select>
        <Input
          name="phone"
          id="phone"
          label="Telefone"
          defaultValue={a.phone ?? ""}
        />
        <Input
          name="emailContact"
          id="emailContact"
          type="email"
          label="E-mail"
          defaultValue={a.email_contact ?? ""}
        />
        <Input
          name="city"
          id="city"
          label="Cidade"
          defaultValue={a.city ?? ""}
        />
        <Input
          name="state"
          id="state"
          label="UF"
          maxLength={2}
          defaultValue={a.state ?? ""}
        />
        <Input name="bio" id="bio" label="Bio" defaultValue={a.bio ?? ""} />
        <Button type="submit">Salvar alterações</Button>
      </form>
    </div>
  );
}
