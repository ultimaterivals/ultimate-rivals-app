# Season 1 Calendar Operations

O calendário mestre é o eixo operacional para UR Play, treinos, Hunter, torneios e eventos especiais.

## Entidades

- `calendar_events`: evento operacional com polo, venue, tipo, status, janela, capacidade e meta de quadras.
- `event_occurrences`: ocorrências futuras quando um evento recorrente for materializado.
- `event_courts`: quadras atribuídas ao evento/ocorrência.
- `event_staff_assignments`: staff operacional com papéis técnicos, arbitragem, mídia e coaching.
- `event_checklists`: tarefas por fase D-14, D-7, D-3, D-0, D+1 e D+2.
- `calendar_q1_templates`: templates Q1 configuráveis de Betim/Contagem.

## Templates Q1

- Betim: segunda e terça, 18:00–20:00 e 20:00–22:00.
- Contagem: quarta e quinta, 18:00–20:00 e 20:00–22:00.
- Sexta: slots alternados entre Betim e Contagem.
- Uso principal: `ur_play` com `scheduled_rounds`.
- A meta inicial é até 2 quadras por polo, mas o evento registra `court_count_target` e `event_courts` para não assumir disponibilidade fixa.

## Conflitos

A view `calendar_event_conflicts` sinaliza:

- `court_overlap`: mesma quadra em eventos sobrepostos.
- `staff_overlap`: mesma pessoa em eventos sobrepostos.

## Segurança

Todas as tabelas têm RLS e FORCE RLS. Admin/operator podem operar; pole manager vê eventos do polo gerenciado; staff vê seus próprios eventos.
