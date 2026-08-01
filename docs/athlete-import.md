# Importação CSV de atletas

Colunas: `public_name,full_name,birth_date,gender,email_contact,phone,city,state`.

O fluxo faz parse, validação Zod, preview e marca duplicatas antes da confirmação. Lotes mistos ou com duplicatas ficam bloqueados; não há inserção parcial silenciosa. Limite: 500 linhas. Nesta versão simples, valores não podem conter vírgulas.
