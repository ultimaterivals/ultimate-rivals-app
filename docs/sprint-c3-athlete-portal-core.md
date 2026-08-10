# Sprint C3 — Portal do Atleta

## Objetivo

Transformar `/athlete` de placeholder em uma visão real da jornada esportiva conectada ao mesmo Supabase usado pelo Command Center.

## Vínculo de identidade

A conta autenticada é ligada ao atleta por `athletes.profile_id = auth.uid()`. Nenhum identificador de atleta é aceito da URL para decidir o perfil principal.

## Rotas

- `/athlete` — Meu jogo;
- `/athlete/agenda` — oportunidades, interesses e reservas;
- `/athlete/ranking` — classificações individuais;
- `/athlete/perfil` — identidade, equipes, pacotes, Coins e créditos.

## Fontes

- `athletes`;
- `athlete_report_summary`;
- `individual_ranking`;
- `team_memberships` / `teams`;
- `athlete_commercial_packages` / `packages`;
- `activity_reservations`;
- `session_interests`;
- `athlete_agenda_opportunities`;
- `athlete_billing_items`.

As views usadas são `security_invoker`, e as tabelas de dados pessoais possuem RLS para o atleta atual.

## Limite desta sprint

A C3 é read-only. Os botões de interesse, reserva, compra e cancelamento entram na camada transacional seguinte. Separar visualização de escrita permite validar primeiro identidade, RLS e read model.
