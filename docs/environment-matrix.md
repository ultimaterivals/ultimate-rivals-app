# Environment matrix

| Ambiente | Uso                                                  | Dados reais                             | Supabase                                     |
| -------- | ---------------------------------------------------- | --------------------------------------- | -------------------------------------------- |
| DEV      | Desenvolvimento e homologacao com fixtures ficticias | Proibido                                | `ultimate-rivals-dev / jrzmqlhfkhaejvmiyxzy` |
| PROD     | Operacao real futura                                 | Permitido somente apos go-live aprovado | Nao configurado nesta etapa                  |

`.env.local` nao deve ser versionado. `SUPABASE_SERVICE_ROLE_KEY` nunca deve ir para client ou variavel `NEXT_PUBLIC_*`.
