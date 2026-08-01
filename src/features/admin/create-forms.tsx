"use client";

import { useActionState, type ReactNode } from "react";
import { Button, Input, Select } from "@/components/ui";
import {
  createAthleteAction,
  createPoleAction,
  createSeasonAction,
  createTeamAction,
  type AdminActionState,
} from "./actions";

const initial: AdminActionState = { status: "idle" };
function FormShell({
  action,
  children,
}: {
  action: (
    state: AdminActionState,
    form: FormData,
  ) => Promise<AdminActionState>;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form
      action={formAction}
      className="rounded-ur bg-ur-graphite grid gap-4 border p-5"
    >
      {children}
      {state.message && (
        <p
          role="status"
          className={
            state.status === "error"
              ? "text-sm text-red-400"
              : "text-ur-gold text-sm"
          }
        >
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Criar"}
      </Button>
    </form>
  );
}
export function AthleteCreateForm() {
  return (
    <FormShell action={createAthleteAction}>
      <Input id="publicName" name="publicName" label="Nome público" required />
      <Input id="fullName" name="fullName" label="Nome completo" required />
      <Select id="gender" name="gender" label="Gênero" required>
        <option value="female">Feminino</option>
        <option value="male">Masculino</option>
        <option value="non_binary">Não binário</option>
        <option value="undisclosed">Não informado</option>
      </Select>
    </FormShell>
  );
}
export function PoleCreateForm() {
  return (
    <FormShell action={createPoleAction}>
      <Input id="name" name="name" label="Nome" required />
      <Input id="slug" name="slug" label="Slug" required />
      <Input id="city" name="city" label="Cidade" required />
      <Input
        id="state"
        name="state"
        label="UF"
        minLength={2}
        maxLength={2}
        required
      />
    </FormShell>
  );
}
export function TeamCreateForm({
  poles,
}: {
  poles: readonly { id: string; name: string }[];
}) {
  return (
    <FormShell action={createTeamAction}>
      <Input id="name" name="name" label="Nome" required />
      <Input id="slug" name="slug" label="Slug" required />
      <Input id="shortName" name="shortName" label="Nome curto" />
      <Select
        id="primaryPoleId"
        name="primaryPoleId"
        label="Polo oficial"
        required
      >
        <option value="">Selecione</option>
        {poles.map((pole) => (
          <option key={pole.id} value={pole.id}>
            {pole.name}
          </option>
        ))}
      </Select>
    </FormShell>
  );
}
export function SeasonCreateForm() {
  return (
    <FormShell action={createSeasonAction}>
      <Input id="name" name="name" label="Nome" required />
      <Input id="code" name="code" label="Código" required />
      <Input
        id="startsAt"
        name="startsAt"
        type="datetime-local"
        label="Início"
        required
      />
      <Input
        id="endsAt"
        name="endsAt"
        type="datetime-local"
        label="Fim"
        required
      />
    </FormShell>
  );
}
