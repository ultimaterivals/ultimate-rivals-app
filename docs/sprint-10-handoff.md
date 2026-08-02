# Sprint 10 — handoff

Branch: `feature/sprint-10-rankings`.

Entrega: classificações individual, por nível, equipe, polo, dupla e quarteto; ciclo e temporada; snapshots, movimento, fechamento e correção auditada; portais admin, atleta, equipe e público; perfil `noindex`; CSV; RLS e testes.

O ledger permanece a fonte única. `ranking_entries` é projeção descartável/sanitizada atualizada ao fim do processamento. Busca e filtros são server-side; paginação usa cursor. Índices cobrem escopo, posição, busca, relações e ledger.

Fora do escopo: UR Coins, Torneio de Polo, Regional, Legends, premiações, repasses e classificação automática para torneios. A Sprint 11 não foi iniciada.
