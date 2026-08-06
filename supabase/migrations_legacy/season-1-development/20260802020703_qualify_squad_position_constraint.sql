do $$
declare
  definition text;
  corrected text;
begin
  select pg_get_functiondef(procedure.oid)
  into definition
  from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'private'
    and procedure.proname = 'promote_match_reserve'
    and pg_get_function_identity_arguments(procedure.oid) = 'target_reserve uuid, target_participant uuid, outgoing_disposition text, reason text, operation_id uuid';

  if definition is null or position('set constraints match_squad_position_unique deferred' in lower(definition)) = 0 then
    raise exception 'expected promote_match_reserve definition was not found';
  end if;

  corrected := replace(
    definition,
    'set constraints match_squad_position_unique deferred',
    'set constraints public.match_squad_position_unique deferred'
  );
  execute corrected;
end;
$$;
