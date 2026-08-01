# Handoff — Sprint 5

Branch `feature/sprint-5-seasons-levels`. Ambiente remoto exclusivo: `ultimate-rivals-dev` (`jrzmqlhfkhaejvmiyxzy`).

Migrations aditivas: `20260801215832_seasons_leveling_assessments_progression.sql` e `20260801220708_fix_assessment_score_transaction.sql`. A segunda preserva o histórico da primeira e corrige atomicamente a inserção de scores.

Fixtures são exclusivamente `[TEST]` e removidas ao final. UR Play, partidas, ranking, pontuação, torneios, UR Coins e repasses permanecem fora do escopo.
