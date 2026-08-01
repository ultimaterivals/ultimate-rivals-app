# Sprint 2.1 — Handoff

O banco DEV remoto foi homologado com migrations controladas, seed fictício, seis usuários de teste e sessões reais. Uma recursão entre policies foi detectada pelos testes e corrigida por migration aditiva com helpers privados `security definer` e `search_path` vazio.

Cobertura concluída: constraints, triggers, auditoria, RLS por papel, privilege escalation, IDOR, audit tampering, integração e fluxos autenticados desktop/mobile. O bootstrap do primeiro admin está documentado separadamente.

Permanecem fora do escopo: ranking, pontuação, UR Play e torneios. A Sprint 3 não deve iniciar automaticamente.
