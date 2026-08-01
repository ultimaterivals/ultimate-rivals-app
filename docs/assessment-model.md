# Modelo de avaliações

`athlete_assessments` armazena contexto, tipo, escopo (`overall`, `doubles`, `fours`), visibilidade e feedback. `assessment_criteria` contém a configuração editável; `athlete_assessment_scores` guarda notas 1–5 por critério.

Os pesos preparados são 60% revisão técnica e 40% dados do sistema. Como partidas e estatísticas não existem, o estado permanece `partial` e nenhum score final combinado é inventado.
