# ADR-ATH-002 — AthleteShell preservado

- **Status:** Accepted
- **Data:** 2026-08-28

## Contexto

O Athlete App já possui uma superfície própria, responsável por organizar sua navegação e identidade. A continuidade do produto não deve reconstruir essa base nem substituí-la pela experiência administrativa.

## Decisão

Preservar o `AthleteShell` como shell do Athlete App e evoluí-lo de forma incremental dentro da arquitetura aprovada.

## Consequências

- Refatorações de design system e navegação devem acontecer sobre o `AthleteShell`.
- Funcionalidades operacionais do Command Center não devem determinar a composição do shell do atleta.
- Código válido existente deve ser preservado durante a evolução da experiência.
