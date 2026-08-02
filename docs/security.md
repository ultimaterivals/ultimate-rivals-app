# Segurança

No UR Play, operadores atuam apenas em sessão atribuída, atletas acessam a própria inscrição e todas as tabelas usam RLS forçada e auditoria.

Em Court Ops, apenas admin ou staff operacional atribuído muta via RPC. Atleta e gestor possuem somente leitura contextual; anônimo não recebe grants.

Somente admin homologa níveis, corrections e proteções. Operator cria avaliações, mas não aprova reviews. Managers têm leitura esportiva contextual; atleta lê somente avaliações e feedbacks explicitamente liberados.

O bucket privado `team-logos` limita JPEG/PNG/WebP a 5 MB e usa a primeira pasta UUID como escopo da equipe. Admin gerencia qualquer escudo; gestor somente o próprio; atleta e gestor de polo têm leitura relevante. A atualização de `teams` por gestor é protegida por trigger e só aceita `logo_url`/`updated_at`.

Atleta 360 usa bucket privado, MIME/tamanho limitados, nomes UUID, RLS de ownership e trigger de proteção de campos. Managers e anon não leem a tabela privada de atletas.

- A autorização usa `profiles.role` consultado no banco. `app_metadata` e `user_metadata` nunca decidem acesso.
- A chave pública/publishable pode estar no cliente; `service_role` e secret keys nunca usam prefixo `NEXT_PUBLIC_`.
- O Proxy renova a sessão e as áreas protegidas validam claims no servidor.
- Toda futura tabela em schema exposto terá RLS habilitada, grants explícitos e políticas de propriedade/escopo. `TO authenticated` isolado não é autorização.
- Policies de update terão `USING` e `WITH CHECK`; views expostas usarão `security_invoker`.
- Funções `security definer` serão excepcionais, em schema não exposto, com grants revogados e checagem explícita de identidade.
- Auditoria, retenção, LGPD, revogação de sessão e duração de JWT ainda precisam de decisão formal.

O Supabase passou a não expor automaticamente novas tabelas à Data API em novos projetos. Migrações futuras devem tratar `GRANT` e RLS como decisões separadas e verificáveis.

## Sprint 2

- Todas as 15 tabelas expostas habilitam e forçam RLS; `anon` não recebe grants.
- Admin possui escrita; operator permanece read-only; gestores têm leitura limitada por `access_assignments`; atleta lê somente dados próprios/controlados.
- Role, nível, vínculos e elencos são escritos apenas por admin nesta sprint.
- Helpers `security definer` ficam em `private`, têm `search_path` vazio e execução revogada por padrão.
- Audit triggers obtêm ator por `auth.uid()`; clientes não inserem, alteram ou apagam logs.
- Constraints de exclusão impedem períodos ativos incompatíveis para vínculo e nível.

RLS ainda precisa de teste de integração contra Postgres real porque Docker não está instalado nesta estação.
