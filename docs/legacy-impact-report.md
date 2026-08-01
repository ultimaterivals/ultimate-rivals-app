# Relatório de impacto em legados

## Contexto

Antes do isolamento desta aplicação, uma execução de `prettier --write .` partiu da pasta pai `Ultimate Rivals Sistema` e alcançou arquivos externos à nova fundação. Sem um baseline Git na pasta pai, não é seguro tentar restaurá-los automaticamente.

## Diretórios e arquivos externos afetados

- `.claude/`
- `ultimate-rivals-site-v2/`
- `ultimate-rivals-v1/`
- `UR_Backup_MVP_2026-05-18_1054/`
- `athletes_import.json`
- `LEIA-ME.md`

## Tipo de alteração conhecida

Normalização de formatação por Prettier, incluindo espaçamento, quebras de linha e organização textual. Não há evidência de alteração intencional de regra de negócio, mas a ausência de histórico Git na pasta pai impede uma comparação conclusiva.

## Limite do novo repositório

Todos os itens acima estão fora de `ultimate-rivals-app` e não fazem parte deste repositório. Nenhum deles foi restaurado, formatado ou editado durante o Sprint 1.1.

## Recomendação

Comparar cada projeto externo com seu remote Git ou backup confiável. Restaurar somente após revisar o diff e preservar eventuais alterações legítimas posteriores.
