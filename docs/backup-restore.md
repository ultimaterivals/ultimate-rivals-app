# Backup and restore

## Backup antes de migrations

- Confirmar project ref.
- Exportar schema e dados com ferramenta oficial Supabase/pg_dump.
- Registrar timestamp, autor e commit alvo.

## Restore

- Restaurar primeiro em ambiente isolado.
- Validar migrations, RLS, Auth e smoke tests.
- Nunca restaurar dados reais em DEV sem aprovacao explicita e plano de privacidade.
