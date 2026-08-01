# Handoff — Sprint 1.1

## Estado entregue

A fundação está isolada em repositório próprio, com branch `main`, dependências fixadas e validações automatizadas. A aplicação contém apenas infraestrutura e telas-base, sem schema ou regra esportiva.

## Segurança e arquitetura

- Não há chave secreta Supabase no código.
- A chave publishable é fornecida por variável de ambiente.
- Autorização de portal ocorre no servidor via `requireRole`.
- O papel é lido de `app_metadata`, não de entrada do navegador ou `user_metadata`.
- Não existe endpoint para autopromoção de papel.
- Componentes React não executam consultas ao banco nem regras esportivas.

## Próxima entrada necessária

Projeto Supabase de desenvolvimento e especificação do primeiro recorte de domínio: cadastro de atleta e seus vínculos. Antes de migrar tabelas, definir invariantes, ownership, RLS, auditoria e critérios de aceite.

## Riscos transferidos

- Os legados externos formatados antes deste sprint ainda precisam ser comparados com fonte confiável.
- Autenticação com usuário real e policies RLS dependem de um projeto Supabase conectado.
- Estratégia offline requer ADR próprio.
