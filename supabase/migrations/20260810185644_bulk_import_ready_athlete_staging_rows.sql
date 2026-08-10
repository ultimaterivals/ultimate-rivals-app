create or replace function private.admin_import_ready_athlete_batch(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $$
declare
  v_actor uuid;
  v_row_id uuid;
  v_imported integer := 0;
  v_batch public.athlete_import_batches%rowtype;
begin
  v_actor := private.require_admin_actor();
  select * into v_batch from public.athlete_import_batches where id=p_batch_id for update;
  if not found then raise exception 'IMPORT_BATCH_NOT_FOUND'; end if;
  if v_batch.status in ('cancelled','completed') then raise exception 'IMPORT_BATCH_NOT_OPEN'; end if;

  for v_row_id in
    select id from public.athlete_import_rows
    where batch_id=p_batch_id and validation_status='ready'
    order by source_row
    for update
  loop
    perform private.admin_import_athlete_staging_row(v_row_id);
    v_imported := v_imported + 1;
  end loop;

  perform private.refresh_athlete_import_batch_counts(p_batch_id);
  select * into v_batch from public.athlete_import_batches where id=p_batch_id;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(v_actor,'athlete_import_batch.ready_rows_imported','athlete_import_batch',p_batch_id,
    jsonb_build_object('imported_now',v_imported,'imported_total',v_batch.imported_rows,'review_rows',v_batch.review_rows,'blocked_rows',v_batch.blocked_rows),
    jsonb_build_object('mode','atomic_ready_batch'));

  return jsonb_build_object(
    'batch_id',p_batch_id,
    'imported_now',v_imported,
    'imported_total',v_batch.imported_rows,
    'review_rows',v_batch.review_rows,
    'blocked_rows',v_batch.blocked_rows
  );
end;
$$;

create or replace function public.admin_import_ready_athlete_batch(p_batch_id uuid)
returns jsonb
language sql
set search_path to 'pg_catalog','public','private'
as $$ select private.admin_import_ready_athlete_batch(p_batch_id); $$;

revoke all on function public.admin_import_ready_athlete_batch(uuid) from public,anon;
grant execute on function public.admin_import_ready_athlete_batch(uuid) to authenticated;
