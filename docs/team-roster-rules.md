# Regras de formações

Equipe e formação são entidades diferentes. `team_rosters` identifica uma formação oficial por equipe, temporada, formato, categoria e nível; `team_roster_members` preserva seus membros e encerramentos.

- Dupla: exatamente dois titulares para ativação, nenhum reserva e no máximo cinco formações por categoria/equipe/temporada.
- Quarteto: exatamente quatro titulares para ativação, até três reservas e no máximo sete membros ativos.
- Capitão pode ser titular ou reserva.
- `leveling` não forma roster competitivo.
- Todo membro precisa de vínculo ativo na mesma equipe e temporada.
- Female aceita `female`, male aceita `male`, mixed aceita ambos; a proporção 2F/2M em quadra permanece futura.
- A formação não pode estar abaixo do atleta mais forte: N1 domina N2, que domina N3.

Triggers no banco são a barreira final; Zod e UI antecipam mensagens e escolhas válidas.
