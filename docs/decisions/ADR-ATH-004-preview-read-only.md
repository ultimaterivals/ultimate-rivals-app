# ADR-ATH-004 — Preview administrativo somente leitura

- **Status:** Accepted
- **Data:** 2026-08-28

## Contexto

A operação precisa visualizar a experiência do atleta para validação e suporte, sem assumir sua identidade nem ampliar permissões de acesso.

## Decisão

Manter o Preview administrativo somente leitura. O Preview não usa impersonation, não troca a autenticação pelo atleta e não contorna RLS.

## Consequências

- Toda ação mutável deve permanecer indisponível no Preview.
- Autorizações e políticas RLS continuam sendo aplicadas nas fronteiras normais do sistema.
- Testes devem demonstrar que o Preview não permite mutações nem escalada de privilégios.
