# Bootstrap do primeiro administrador

O primeiro administrador não é promovido pelo cliente, por signup automático nem por metadata do usuário. O procedimento é deliberadamente administrativo e auditável:

1. criar e confirmar o usuário em Authentication no projeto correto;
2. validar novamente nome e project ref do ambiente;
3. em uma sessão SQL administrativa, inserir o perfil com o mesmo `auth.users.id`, `role = 'admin'` e `status = 'active'`;
4. registrar operador, justificativa e evidência no change log externo;
5. autenticar com a chave publicável e confirmar o acesso pelo RLS;
6. encerrar a sessão administrativa e rotacionar qualquer credencial temporária.

Depois do bootstrap, somente um admin existente pode gerir perfis pelas policies. Nunca disponibilizar endpoint público de promoção e nunca confiar em `user_metadata` para autorização.
