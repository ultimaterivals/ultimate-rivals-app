# ADR-ATH-003 — Command Center e Athlete App separados

- **Status:** Accepted
- **Data:** 2026-08-28

## Contexto

O Command Center atende à operação e à administração completas, enquanto o Athlete App atende à jornada esportiva, imersiva e orientada à carreira do atleta. Os produtos compartilham a mesma realidade de negócio, mas têm necessidades de experiência distintas.

## Decisão

Manter Command Center e Athlete App como produtos separados. Eles podem compartilhar backend, entidades, contratos, RPCs e ledgers, mas não a mesma experiência visual.

## Consequências

- Componentes administrativos não devem ser transplantados automaticamente para o Athlete App.
- Regras de negócio compartilhadas devem continuar canônicas no backend.
- O Athlete App não deve assumir aparência ou comportamento de portal administrativo.
