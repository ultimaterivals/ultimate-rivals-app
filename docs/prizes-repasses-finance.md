# Premiações, repasses e financeiro operacional

Este bloco fecha a base P0 de Season 1 para prêmios, repasses e cockpit financeiro.

## Premiações

- `tournament_prize_plan_templates` guarda os templates Q1 configuráveis para UR Series, UR Cup e UR Legends.
- `tournament_prize_template_allocations` guarda os valores de referência revisáveis por admin.
- `tournament_prize_plans` continua sendo o plano aplicado a um torneio real, agora com `published_at` e `frozen_snapshot`.
- `tournament_prize_allocations` registra obrigações aplicadas por prêmio, sem executar transferência bancária.

Valores Q1 versionados:

- UR Series: campeão R$800, vice R$400, 3º R$300, MVP R$500.
- UR Cup: campeão R$1.200, vice R$800, 3º R$500, MVP R$700.
- UR Legends: campeão R$800, vice R$400, 3º R$300, MVP R$500.

## Repasses

`season_repass_plans` registra o plano trimestral oficial de R$5.000 e `season_repass_allocations` registra as seis alocações de referência:

- 1ª equipe elegível: R$1.500.
- 2ª equipe elegível: R$1.000.
- 3ª equipe elegível: R$1.000.
- 1º atleta: R$500.
- 2º atleta: R$500.
- 3º atleta: R$500.

O repasse depende de ranking final homologado e elegibilidade. O Legends é palco de entrega, mas não redefine o ranking trimestral.

## Financeiro operacional

O escopo não é ERP. As tabelas `revenue_entries` e `expense_entries` cobrem apenas cockpit operacional com:

- temporada, evento, polo, quadra/venue e origem;
- categoria, valor, status, ocorrência e vencimento;
- vínculos opcionais com charges, pagamentos, torneios, UR Play, prêmios e repasses.

Read models:

- `event_financial_summaries`;
- `venue_financial_summaries`;
- `sponsor_financial_summaries`;
- `prize_obligations`;
- `repass_obligations`;
- `admin_prize_repass_operations`.

## Segurança

- Todas as tabelas públicas novas têm RLS e FORCE RLS.
- Financeiro operacional é legível apenas por admin/operator.
- Escrita financeira é admin/operator; delete é admin.
- Atletas e team managers não leem ledger financeiro bruto.
- Nenhuma tabela armazena dados bancários sensíveis.
- Nenhuma transferência bancária ou gateway externo foi implementado.
