# Production readiness

Status desta completion run: somente DEV homologado. Nenhuma operacao foi executada em PROD.

## Antes de PROD

1. Confirmar project ref PROD no dashboard e no CLI.
2. Fazer backup completo do banco PROD.
3. Revisar migrations aplicadas no DEV e ordem de aplicacao.
4. Habilitar configuracoes manuais de Auth, incluindo leaked password protection se disponivel.
5. Configurar Storage privado para midia de origem.
6. Executar admin bootstrap controlado.
7. Rodar smoke tests publicos e autenticados.
8. Rodar subset do Golden Path.
9. Rodar Security Advisor e Performance Advisor.

## Bloqueios externos

- Advisors nao estao expostos no conector atual.
- CLI local nao esta autenticado com `SUPABASE_ACCESS_TOKEN`; usar dashboard/CLI autenticado no go-live.
- Nenhum dado real deve ser importado ate a matriz de privacidade ser revisada.
