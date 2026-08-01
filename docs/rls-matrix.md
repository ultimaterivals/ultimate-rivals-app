# Matriz RLS

| Entidade                   | Admin                      | Operator           | Pole manager        | Team manager                         | Athlete                | Public |
| -------------------------- | -------------------------- | ------------------ | ------------------- | ------------------------------------ | ---------------------- | ------ |
| profiles                   | CRUD, exceto delete físico | próprio perfil (R) | próprio perfil (R)  | próprio perfil (R)                   | próprio perfil (R)     | negar  |
| athletes                   | CRUD                       | R                  | negar PII           | negar PII                            | próprio (R/U limitado) | negar  |
| athlete_notes              | CRUD                       | R                  | negar               | negar                                | próprias visíveis      | negar  |
| athlete-avatars            | CRUD                       | negar              | negar               | negar                                | pasta própria          | negar  |
| seasons/categories/formats | CRUD                       | R                  | R                   | R                                    | R                      | negar  |
| poles/venues/courts        | CRUD                       | R                  | polo atribuído (R)  | polo da equipe (R)                   | R controlado           | negar  |
| teams                      | CRUD                       | R                  | equipes do polo (R) | equipe atribuída (R)                 | equipe ativa (R)       | negar  |
| memberships/levels         | CRUD                       | R                  | escopo do polo (R)  | escopo da equipe (R)                 | próprio (R)            | negar  |
| rosters/members            | CRUD                       | R                  | escopo do polo (R)  | equipe atribuída (R; escrita adiada) | próprio (R)            | negar  |
| access_assignments         | CRUD                       | negar              | próprio (R)         | próprio (R)                          | negar                  | negar  |
| audit_logs                 | INSERT via trigger e R     | R                  | negar               | negar                                | negar                  | negar  |

## Notas

- `R` significa SELECT sujeito à linha/escopo; escrita não indicada é negada.
- Admin não apaga `audit_logs`.
- Operator permanece read-only nesta sprint.
- Escrita de team/pole managers é conservadoramente adiada até haver casos de uso homologados.
- Policies usam role e escopo consultados no banco; nunca confiam em role enviado pelo browser.
- O Data API não recebe política ampla “authenticated can do everything”.
