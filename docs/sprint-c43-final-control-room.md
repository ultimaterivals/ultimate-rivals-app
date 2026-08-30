# Sprint C43 — Sala de Controle Final do Command

## Objetivo

Consolidar o Command como sala de controle executiva do Ultimate Rivals sem remover ou substituir módulos especializados.

## Escopo

- visão `Sala de controle · Hoje` baseada no snapshot administrativo existente;
- mesa de ação da sessão prioritária;
- ciclo `Presença → Gate de início → Quadra → Fechamento → Pós-Sessão 360`;
- riscos de quadra e staff nas sessões futuras;
- economia por sessão com receita, despesa e margem verificadas;
- rastreabilidade do horário e da integridade das fontes;
- UAT autenticada desktop/mobile sem credenciais versionadas.

## Guardrails

- entrega estritamente aditiva;
- nenhuma métrica, estado ou fonte de verdade paralela;
- projeção e realizado permanecem separados;
- dado ausente não vira zero estimado;
- ações continuam nos módulos especializados;
- leitura econômica restrita a administrador;
- Command e Athlete App permanecem produtos separados.

## Origem reconciliada

A implementação útil da antiga PR #64 foi portada sobre a `main` atual. A branch histórica estava 561 commits atrás e não deve ser integrada diretamente. O ciclo foi renomeado para C43 para não colidir com o C42 — Relatório & Aprendizados já publicado.

## Gates

- format;
- lint;
- TypeScript;
- unit/integration;
- production build;
- Preview conectado ao Supabase Dev;
- UAT autenticada desktop/mobile;
- smoke pós-deploy antes de qualquer promoção.
