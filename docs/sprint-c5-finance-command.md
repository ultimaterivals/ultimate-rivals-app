# Sprint C5 — Financeiro do Command

## Objetivo

Substituir o placeholder financeiro por uma leitura real de receitas, despesas, cobranças e obrigações.

## Fontes

- `event_financial_summaries`;
- `admin_payment_operations`;
- `admin_prize_repass_operations`.

## Regras

- valores verificados e projetados permanecem separados;
- cobranças abertas consideram `pending` e `submitted`;
- saldo de cobrança considera valor total menos valor pago verificado/submetido consolidado pela view;
- obrigações permanecem abertas até `paid` ou `void`;
- nenhuma premiação ou repasse é inventado na interface: a obrigação precisa existir no plano oficial do banco.

## Próximo

A configuração do plano trimestral oficial, incluindo os R$ 5.000 de repasses definidos pelo negócio, deve ser criada no backend como plano versionado, não hardcoded na UI.
