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
