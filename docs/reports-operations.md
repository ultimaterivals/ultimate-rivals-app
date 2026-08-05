# Relatorios da Temporada 1

Os relatorios finais foram implementados como read models SQL com `security_invoker`, para respeitar RLS e evitar views privilegiadas.

## Read models

- `athlete_report_summary`
- `team_report_summary`
- `venue_report_summary`
- `sponsor_report_summary`
- `season_executive_report_summary`

## Escopo

Os dashboards de `/admin/reports` mostram resumo operacional suficiente para piloto:

- atleta: jogos, competicoes, treino, Hunter e saldo URC;
- equipe: atletas ativos, rosters e inscricoes;
- quadra: sessoes, eventos e financeiro agregado;
- sponsor: agreements, deliveries e ofertas Market;
- temporada: atletas ativos, sessoes, treinos, partidas, torneios, receitas e despesas.

Nao foram inventados dados como reach, views ou leads quando nao existem tabelas/fontes para eles.

## Export

CSV/PDF ficam como operacao posterior caso a direcao realmente precise baixar arquivos. O MVP prioriza dashboard vivo e validado contra dados DEV ficticios.
