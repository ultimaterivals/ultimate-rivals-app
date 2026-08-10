# Sprint C2 — Agenda e Demanda

## Objetivo

Transformar `/admin/agenda` em uma visão operacional semanal real, conectada ao calendário e à camada de demanda existentes.

## Janela operacional

- padrão: 06:00–00:00;
- grade: 30 minutos;
- sessão UR Play de referência: 2 horas;
- presets de visualização: 06–00, 06–18, 12–00 e 18–00.

Os presets afetam somente a visualização; horários dos eventos permanecem definidos pelos registros `starts_at`/`ends_at`.

## Fontes

- `poles`;
- `admin_calendar_operations`;
- `admin_demand_dashboard`.

Nenhuma nova tabela foi criada.

## Regras

- interesse e reserva permanecem conceitos separados;
- oportunidades de demanda podem estar ligadas a um `calendar_event_id`;
- quando ligadas, reservas e formações aparecem no bloco do evento;
- conflitos ganham destaque crítico;
- sessões com reservas recebem destaque visual;
- checklists abertos aparecem no bloco quando há espaço visual;
- a lista mobile substitui a grade extensa em telas pequenas.

## Segurança

O filtro por polo reduz o conjunto já devolvido pela sessão autenticada. Ele não concede acesso a outro polo. Escopo autoritativo continua sendo responsabilidade do RLS/access assignments.

## Escritas

C2 permanece read-only. Criação/edição de oportunidades e sessões entra após homologação da visualização e dos contratos transacionais.
