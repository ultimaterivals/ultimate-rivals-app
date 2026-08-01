# Homologação de segurança — Sprint 2.1

Ambiente exclusivo: `ultimate-rivals-dev` (`jrzmqlhfkhaejvmiyxzy`). Os testes usam chave publicável e sessões JWT reais; service role não é usada para operações normais.

- RLS: 15 tabelas públicas com RLS habilitado; admin, operator, pole manager, team manager, athlete e anon validados.
- Escalada: alteração de `profiles.role` e mass assignment por atleta foram negados.
- IDOR: atleta e gestores não acessam nem alteram entidades fora do próprio escopo.
- Auditoria: ator, estado anterior/posterior e metadata validados; update/delete negados a todos os papéis da aplicação.
- Constraints: sobreposição temporal, intervalos inválidos, duplicidade e FK órfã foram rejeitados.
- Service role: nenhuma secret/service-role key está presente no cliente ou em arquivo de ambiente versionado.
- Security Advisor: nenhuma tabela sem RLS; alertas restantes são proteção de senhas vazadas desabilitada e localização da extensão `btree_gist`.

Os dados são exclusivamente fictícios e identificados para DEV.
