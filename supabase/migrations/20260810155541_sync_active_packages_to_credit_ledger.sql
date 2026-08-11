create or replace function private.sync_active_package_credit_grant()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_remaining integer;
begin
  if new.status::text = 'active'
     and (tg_op = 'INSERT' or old.status::text is distinct from 'active') then
    v_remaining := greatest(coalesce(new.units_total, 0) - coalesce(new.units_used, 0), 0);
    if v_remaining > 0 then
      insert into public.commercial_credit_ledger (
        athlete_id,
        athlete_package_id,
        event_type,
        available_delta,
        idempotency_key,
        reason,
        actor_user_id,
        metadata
      ) values (
        new.athlete_id,
        new.id,
        'grant',
        v_remaining,
        'package-activation:' || new.id::text,
        'Créditos concedidos pela ativação do pacote comercial',
        auth.uid(),
        jsonb_build_object('package_id', new.package_id, 'units_total', new.units_total, 'units_used_at_activation', new.units_used)
      ) on conflict (idempotency_key) do nothing;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.sync_active_package_credit_grant() from public, anon, authenticated;

drop trigger if exists sync_active_package_credit_grant on public.athlete_commercial_packages;
create trigger sync_active_package_credit_grant
after insert or update of status on public.athlete_commercial_packages
for each row execute function private.sync_active_package_credit_grant();

create or replace function private.protect_active_package_entitlement()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $$
begin
  if old.status::text = 'active' and (
    new.athlete_id is distinct from old.athlete_id
    or new.package_id is distinct from old.package_id
    or new.units_total is distinct from old.units_total
    or new.starts_at is distinct from old.starts_at
    or new.ends_at is distinct from old.ends_at
  ) then
    raise exception 'Active package entitlement is immutable; create a compensating package/ledger entry instead';
  end if;
  return new;
end;
$$;

revoke all on function private.protect_active_package_entitlement() from public, anon, authenticated;

drop trigger if exists protect_active_package_entitlement on public.athlete_commercial_packages;
create trigger protect_active_package_entitlement
before update on public.athlete_commercial_packages
for each row execute function private.protect_active_package_entitlement();

insert into public.commercial_credit_ledger (
  athlete_id,
  athlete_package_id,
  event_type,
  available_delta,
  idempotency_key,
  reason,
  metadata
)
select
  ap.athlete_id,
  ap.id,
  'grant',
  greatest(coalesce(ap.units_total, 0) - coalesce(ap.units_used, 0), 0),
  'package-bootstrap:' || ap.id::text,
  'Bootstrap do saldo remanescente na introdução do ledger imutável',
  jsonb_build_object('package_id', ap.package_id, 'units_total', ap.units_total, 'units_used_before_ledger', ap.units_used)
from public.athlete_commercial_packages ap
where ap.status::text = 'active'
  and greatest(coalesce(ap.units_total, 0) - coalesce(ap.units_used, 0), 0) > 0
  and not exists (
    select 1
    from public.commercial_credit_ledger l
    where l.athlete_package_id = ap.id
  )
on conflict (idempotency_key) do nothing;
