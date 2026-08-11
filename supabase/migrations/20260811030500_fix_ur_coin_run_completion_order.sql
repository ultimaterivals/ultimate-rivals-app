create or replace function private.stamp_ur_coin_processing_completion()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
begin
  if new.status='completed' and old.status is distinct from new.status then
    new.completed_at := clock_timestamp();
  end if;
  return new;
end;
$function$;

revoke all on function private.stamp_ur_coin_processing_completion()
  from public, anon, authenticated;

drop trigger if exists ur_coin_processing_runs_stamp_completion
  on public.ur_coin_processing_runs;

create trigger ur_coin_processing_runs_stamp_completion
before update of status on public.ur_coin_processing_runs
for each row
execute function private.stamp_ur_coin_processing_completion();
