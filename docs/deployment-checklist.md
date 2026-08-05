# Deployment checklist

Ordem futura para deploy seguro:

1. Backup.
2. Verificacao explicita de project ref e nome.
3. Extensoes.
4. Migrations na ordem versionada.
5. Auth config.
6. Storage privado.
7. Bootstrap do primeiro admin.
8. Projecoes publicas.
9. Smoke tests.
10. Golden Path subset.
11. Launch.

Nao executar force push, reset destrutivo ou migrations em projeto nao confirmado.

## Migration source of truth

Final feature-freeze decision:

- `CANONICAL_MIGRATION_SOURCE`: repository local migration chain.
- `FRESH_REPLAY`: `PASS`.
- `DEV_SCHEMA_ALIGNMENT`: `PASS`.
- `DEV_HISTORY_ALIGNMENT`: `DIVERGENT_DOCUMENTED`.
- `DEV_HISTORY_REPAIR`: `DEFERRED`.
- `MIGRATION_SEQUENCE_REPRODUCIBLE`: `PASS`.

Release rule:

- Do not require local migration count to equal DEV migration count.
- Require fresh replay PASS, schema equivalence PASS, and no unresolved destructive schema drift.
- PROD must be born from the canonical local migration chain.
- Do not copy DEV's divergent migration history into PROD.
- Do not fabricate remote timestamps, edit applied migrations, or add empty migrations just to equalize counts.
