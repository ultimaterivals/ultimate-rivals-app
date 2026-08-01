# Segurança

- A autorização usa `app_metadata.role`, que não é editável pelo usuário. `user_metadata` nunca decide acesso.
- A chave pública/publishable pode estar no cliente; `service_role` e secret keys nunca usam prefixo `NEXT_PUBLIC_`.
- O Proxy renova a sessão e as áreas protegidas validam claims no servidor.
- Toda futura tabela em schema exposto terá RLS habilitada, grants explícitos e políticas de propriedade/escopo. `TO authenticated` isolado não é autorização.
- Policies de update terão `USING` e `WITH CHECK`; views expostas usarão `security_invoker`.
- Funções `security definer` serão excepcionais, em schema não exposto, com grants revogados e checagem explícita de identidade.
- Auditoria, retenção, LGPD, revogação de sessão e duração de JWT ainda precisam de decisão formal.

O Supabase passou a não expor automaticamente novas tabelas à Data API em novos projetos. Migrações futuras devem tratar `GRANT` e RLS como decisões separadas e verificáveis.
