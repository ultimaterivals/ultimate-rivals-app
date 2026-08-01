# Privacidade do atleta

Dados esportivos: nome público, código UR, avatar autorizado, bio, nível, equipe e polo. Dados privados: nome completo, nascimento, telefone, e-mail e contatos de emergência.

Somente admin/operator e o próprio atleta leem a linha privada. Gestores e anon não acessam `athletes`; páginas públicas não recebem PII. Trigger restringe a edição própria a campos permitidos.

Não armazenamos CPF, RG, endereço residencial, dados bancários ou médicos. O bucket é privado, limitado a 5 MB e JPEG/PNG/WebP, com nomes UUID sem PII.
