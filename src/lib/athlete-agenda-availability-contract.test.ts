import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const agenda = read("src/app/athlete/agenda/page.tsx");
const availability = read("src/app/athlete/disponibilidade/page.tsx");
const availabilityActions = read("src/app/athlete/disponibilidade/actions.ts");
const opportunityCard = read(
  "src/components/athlete/athlete-opportunity-card.tsx",
);

const waitlistMessage =
  '"Você entrou na lista de espera. Nenhum crédito foi reservado agora."';

describe("athlete Jogar and availability communication contract", () => {
  it("frames Jogar around entering the court in the current season phase", () => {
    expect(agenda).toContain("Entre em quadra");
    expect(agenda).toContain("Oportunidades para jogar");
    expect(agenda).toContain("getAthleteSeasonContextSnapshot");
    expect(agenda).toContain("season.phaseLabel");
  });

  it("keeps athlete participation states distinct", () => {
    expect(agenda).toContain(
      "Interesse, reserva, lista de espera,\n              check-in e participação continuam sendo estados diferentes.",
    );
    expect(opportunityCard).toContain('return "Reserva confirmada"');
    expect(opportunityCard).toContain('return "Lista de espera"');
    expect(opportunityCard).toContain('return "Check-in realizado"');
    expect(opportunityCard).toContain('return "Participação concluída"');
    expect(opportunityCard).toContain('"Interesse registrado"');
  });

  it("preserves precise credit communication without converting unknown to zero", () => {
    expect(agenda).toContain(waitlistMessage);
    expect(agenda).toContain("snapshot.creditBalance");
    expect(agenda).not.toContain("snapshot.creditBalance ?? 0");
    expect(opportunityCard).toContain(
      "Entrar em lista de espera não segura crédito.",
    );
    expect(opportunityCard).toContain("A reserva direta fica bloqueada até");
    expect(opportunityCard).toContain("availableCredits: number | null");
  });

  it("keeps availability athlete-first, non-transactional and integrated into Jogar", () => {
    expect(availability).toContain("Ela não é reserva, não consome crédito");
    expect(availability).toContain('href="/athlete/agenda"');
    expect(availability).toContain('href="/athlete/season"');
    expect(availability).toContain(
      "Não existe recomendação automática implícita neste cadastro.",
    );
    expect(agenda).toContain("Quando você pode jogar?");
    expect(agenda).toContain(
      "<AthleteAvailabilityForm snapshot={availability} />",
    );
    expect(availabilityActions).toContain(
      "redirect(`/athlete/agenda?${query}#disponibilidade`)",
    );
  });
});
