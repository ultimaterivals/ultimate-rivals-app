# ADR-ATH-005 — Ranking Points e UR Coins em ledgers separados

- **Status:** Accepted
- **Data:** 2026-08-28

## Contexto

Ranking Points representam desempenho e classificação esportiva. UR Coins representam valor econômico dentro do ecossistema. Misturar os dois conceitos comprometeria auditoria, semântica e evolução das regras.

## Decisão

Manter Ranking Points e UR Coins em ledgers separados, com contratos, saldos e eventos próprios.

## Consequências

- Uma movimentação esportiva não deve ser tratada como movimentação econômica, nem o inverso.
- Correções devem ocorrer por migrations, RPCs ou serviços auditáveis e forward-only, nunca por direct-write corretivo.
- Interfaces devem identificar claramente a natureza de cada saldo e transação.
