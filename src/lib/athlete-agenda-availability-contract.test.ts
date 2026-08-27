import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const agenda = readFileSync(
  resolve(process.cwd(), "src/app/athlete/agenda/page.tsx"),
  "utf8",
);
const availability = readFileSync(
  resolve(process.cwd(), "src/app/athlete/disponibilidade/page.tsx"),
  "utf8",
);
const opportunityCard = readFileSync(
  resolve(
    process.cwd(),
    "src/components/athlete/athlete-opportunity-card.tsx",
  ),
  "utf8",
);

describe("athlete agenda and availability communication contract", () => {
  it("frames Agenda as the place to find where to play in the current season phase", () => {
    expect(agenda).toContain("Encontre onde jogar nesta fase");
    expect(agenda).toContain("getAthleteSeasonContextSnapshot");
    expect(agenda).toContain("season.phaseLabel");
  });

  it("keeps interest, reservation, waitlist, check-in and participation distinct", () => {
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
    expect(agenda).toContain(
      'reserved: "Vaga reservada e 1 crédito colocado em reserva."',
    );
    expect(agenda).toContain(
      '"Você entrou na lista de espera. Nenhum crédito foi reservado agora."',
    );
    expect(agenda).toContain("snapshot.creditBalance");
    expect(agenda).toContain("snapshot.creditReserved");
    expect(agenda).toContain("snapshot.creditConsumed");
    expect(opportunityCard).toContain(
      "Entrar em lista de espera não segura crédito.",
    );
  });

  it("makes availability athlete-first and explicitly non-transactional", () => {
    expect(availability).toContain("Ela não é reserva, não consome crédito");
    expect(availability).toContain('href="/athlete/agenda"');
    expect(availability).toContain('href="/athlete/season"');
    expect(availability).toContain(
      "Não existe recomendação automática implícita neste cadastro.",
    );
  });
});
