# ADR-ATH-012 — Sem dados ou progressão fictícios

- **Status:** Accepted
- **Data:** 2026-08-28

## Contexto

A experiência de carreira depende de confiança. Preencher lacunas com números, badges, scores, recomendações, progresso ou datas inventadas compromete essa confiança e confunde apresentação com fato esportivo.

## Decisão

Dar precedência a dados reais. Informação inexistente não pode virar número, badge, score, recomendação ou progressão fictícia, e datas históricas desconhecidas não podem ser inventadas. Não criar engine paralela de XP, badges, missões ou progressão.

## Consequências

- Estados vazios devem comunicar indisponibilidade ou ausência de dados sem convertê-la em zero factual.
- Histórico esportivo homologado integra a carreira, preservando campos desconhecidos como desconhecidos.
- Reconciliações devem corrigir a origem canônica e auditável, não apenas o preenchimento visual.
