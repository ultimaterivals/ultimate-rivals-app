-- Development/test-only fixtures. Never use as production bootstrap data.
insert into public.seasons (
  id, name, code, starts_at, ends_at, ranking_cutoff_at, status
) values (
  '10000000-0000-4000-8000-000000000001',
  '[DEV] Temporada Teste 01',
  'dev-season-01',
  '2026-01-01 00:00:00+00',
  '2026-12-31 23:59:59+00',
  null,
  'draft'
) on conflict (code) do nothing;

insert into public.poles (id, name, slug, city, state, status) values
  ('20000000-0000-4000-8000-000000000001', '[DEV] Polo Teste BH', 'dev-polo-bh', 'Belo Horizonte', 'MG', 'draft'),
  ('20000000-0000-4000-8000-000000000002', '[DEV] Polo Teste Betim', 'dev-polo-betim', 'Betim', 'MG', 'draft'),
  ('20000000-0000-4000-8000-000000000003', '[DEV] Polo Teste Contagem', 'dev-polo-contagem', 'Contagem', 'MG', 'draft')
on conflict (slug) do nothing;
