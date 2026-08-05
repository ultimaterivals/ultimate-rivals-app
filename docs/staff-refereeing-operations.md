# Staff, arbitragem e setor técnico

O app mantém staff como uma camada operacional, sem folha salarial e sem gateway externo.

- `staff_role_catalog`: papéis permitidos do Q1.
- `staff_profile_roles`: uma pessoa pode acumular papéis, opcionalmente por polo.
- `event_staff_assignments`: escala em eventos/calendário.
- `match_official_assignments`: árbitro, assistente, score operator, coordenador e analista por partida/court.

UR Play regular pode operar como self-officiated com coordenador. Scheduled rounds permitem árbitro configurável. Series, Cup e Legends suportam árbitro formal por match/court.

Resultado homologado recebe trava defensiva: alterações diretas em `match_results` homologados exigem papel `admin`. Operadores seguem os fluxos públicos/funções de scoring já existentes.
