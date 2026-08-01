# Fluxo de desenvolvimento

1. Criar branch curta por entrega.
2. Registrar regras e critérios de aceite antes do schema.
3. Implementar verticalmente em pequenos commits.
4. Validar com `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build`.
5. Para banco: criar migração via CLI (`supabase migration new`), testar localmente, executar advisors, revisar RLS e listar migrações.
6. Abrir PR com riscos, evidências e rollback.

Não versionar `.env.local`, chaves, dumps com dados pessoais ou artefatos de teste.
