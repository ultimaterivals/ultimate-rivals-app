# ADR-ATH-001 — Mobile-first e cinco destinos principais

- **Status:** Accepted
- **Data:** 2026-08-28

## Contexto

O Athlete App é uma experiência esportiva orientada à carreira. Sua navegação primária precisa ser simples, recorrente e adequada ao uso durante a rotina do atleta, sem reproduzir a densidade operacional do Command Center.

## Decisão

Adotar mobile-first e preservar cinco destinos principais na navegação móvel, nesta ordem: **Início**, **Jogar**, **Ranking**, **Hunter** e **Perfil**.

## Consequências

- Novas funcionalidades devem se integrar a esses destinos ou a fluxos secundários, sem ampliar a navegação primária por conveniência.
- Testes de navegação devem verificar os cinco destinos e sua ordem.
- Alterar esse conjunto exige uma nova decisão arquitetural explícita.
