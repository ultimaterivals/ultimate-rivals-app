# Domínio Atleta 360

`athletes` é a identidade esportiva central. Pode existir sem conta; `profile_id` é opcional, único e só é associado por admin. `athlete_code` segue `UR-000001`, é gerado pelo sistema, imutável, único e nunca reutilizado.

O nível deriva de `athlete_levels`; `assign_athlete_level` encerra o nível anterior e cria o próximo na mesma transação. Equipe e polo derivam de memberships. Notas vivem em `athlete_notes` e não podem conter dados médicos.

Duplicidades são sinais, não merges: nome normalizado+nascimento, e-mail, telefone e profile são comparados; o admin decide e documenta falsos positivos.
