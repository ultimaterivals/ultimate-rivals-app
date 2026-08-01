"use client";
import { useActionState } from "react";
import { Button, Input, Select } from "@/components/ui";
import {
  createAthlete360Action,
  updateOwnAthleteAction,
  type AthleteActionState,
} from "./actions";
const initial: AthleteActionState = { status: "idle" };
function Fields({
  own = false,
  defaults = {},
}: {
  own?: boolean;
  defaults?: Record<string, string | null>;
}) {
  return (
    <>
      <Input
        id="publicName"
        name="publicName"
        label="Nome público"
        defaultValue={defaults.public_name ?? ""}
        required
      />
      <Input
        id="bio"
        name="bio"
        label="Bio esportiva"
        defaultValue={defaults.bio ?? ""}
      />
      <Input
        id="instagramHandle"
        name="instagramHandle"
        label="Instagram"
        defaultValue={defaults.instagram_handle ?? ""}
      />
      <Input
        id="city"
        name="city"
        label="Cidade"
        defaultValue={defaults.city ?? ""}
      />
      <Input
        id="state"
        name="state"
        label="UF"
        maxLength={2}
        defaultValue={defaults.state ?? ""}
      />
      <Input
        id="phone"
        name="phone"
        label="Telefone"
        defaultValue={defaults.phone ?? ""}
      />
      <Input
        id="emailContact"
        name="emailContact"
        type="email"
        label="E-mail de contato"
        defaultValue={defaults.email_contact ?? ""}
      />
      {own && (
        <>
          <Select
            id="dominantHand"
            name="dominantHand"
            label="Mão dominante"
            defaultValue={defaults.dominant_hand ?? ""}
          >
            <option value="">Não informada</option>
            <option value="left">Esquerda</option>
            <option value="right">Direita</option>
            <option value="ambidextrous">Ambidestra</option>
          </Select>
          <Input
            id="heightCm"
            name="heightCm"
            type="number"
            label="Altura (cm)"
            defaultValue={defaults.height_cm ?? ""}
          />
        </>
      )}
    </>
  );
}
export function AthleteCreate360Form() {
  const [state, action, pending] = useActionState(
    createAthlete360Action,
    initial,
  );
  return (
    <form
      action={action}
      className="rounded-ur bg-ur-graphite grid gap-4 border p-5"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Input id="fullName" name="fullName" label="Nome completo" required />
        <Input id="birthDate" name="birthDate" type="date" label="Nascimento" />
        <Select id="gender" name="gender" label="Gênero">
          <option value="undisclosed">Não informado</option>
          <option value="female">Feminino</option>
          <option value="male">Masculino</option>
          <option value="non_binary">Não binário</option>
        </Select>
        <Fields />
      </div>
      {state.message && <p role="status">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Cadastrar atleta"}
      </Button>
    </form>
  );
}
export function OwnAthleteForm({
  athlete,
}: {
  athlete: Record<string, string | null>;
}) {
  const [state, action, pending] = useActionState(
    updateOwnAthleteAction,
    initial,
  );
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="athleteId" value={athlete.id ?? ""} />
      <Fields own defaults={athlete} />
      {state.message && (
        <p role="status" className="text-ur-gold">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        Salvar perfil
      </Button>
    </form>
  );
}
