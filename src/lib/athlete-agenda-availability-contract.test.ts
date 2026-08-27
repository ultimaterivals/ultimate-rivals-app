import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const agenda = read("src/app/athlete/agenda/page.tsx");
const availability = read("src/app/athlete/disponibilidade/page.tsx");
const opportunityCard = read(
  "src/components/athlete/athlete-opportunity-card.tsx",
);

const reservedMessage =
  'reserved: "Vaga reservada e 1 crédito colocado em reserva."';
const waitlistMessage =
  '"Você entrou na lista de espera. Nenhum crédito foi reservado agora."';

describe("athlete agenda and availability communication contract", () => {
  it("frames Agenda around where to play in the current season phase", () => {
    expect(agenda).toContain("Encontre onde jogar nesta fase");
    expect(agenda).toContain("getAthleteSeasonContextSnapshot");
    expect(agenda).toContain("season.phaseLabel");
  });

  it("keeps athlete participation states distinct", () => {
    expect(agenda).toContain('"Interesse"');
    expect(agenda).toContain('"Reserva"');
    expect(agenda).toContain('"Lista de espera"');
    expect(agenda).toContain('"Check-in"');
    expect(agenda).toContain('"Participação"');

    expect(opportunityCard).toContain('return "reserva ativa"');
    expect(opportunityCard).toContain('return "lista de espera"');
    expect(opportunityCard).toContain('return "check-in realizado"');
    expect(opportunityCard).toContain('return "participação concluída"');
  });

  it("preserves precise credit communication", () => {
    expect(agenda).toContain(reservedMessage);
    expect(agenda).toContain(waitlistMessage);
    expect(agenda).toContain("snapshot.creditBalance");
    expect(agenda).toContain("snapshot.creditReserved");
    expect(agenda).toContain("snapshot.creditConsumed");
    expect(opportunityCard).toContain(
      "Entrar em lista de espera não segura crédito.",
    );
  });

  it("keeps availability athlete-first and non-transactional", () => {
    expect(availability).toContain("Ela não é reserva, não consome crédito");
    expect(availability).toContain('href="/athlete/agenda"');
    expect(availability).toContain('href="/athlete/season"');
    expect(availability).toContain(
      "Não existe recomendação automática implícita neste cadastro.",
    );
  });
});
