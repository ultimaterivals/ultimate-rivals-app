create or replace function public.admin_create_team(
  p_name text,
  p_primary_pole_id uuid,
  p_short_name text default null
)
returns public.teams
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team public.teams;
  v_name text := nullif(btrim(p_name), '');
  v_short_name text := nullif(btrim(p_short_name), '');
  v_base_slug text;
  v_slug text;
  v_suffix integer := 1;
begin
  if not private.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'admin team creation required' using errcode = '42501';
  end if;

  if v_name is null or char_length(v_name) > 120 then
    raise exception 'valid team name required' using errcode = '23514';
  end if;

  if v_short_name is not null and char_length(v_short_name) > 40 then
    raise exception 'team short name too long' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.poles p
    where p.id = p_primary_pole_id
      and p.status <> 'archived'
  ) then
    raise exception 'valid team pole required' using errcode = '23503';
  end if;

  if exists (
    select 1
    from public.teams t
    where lower(btrim(t.name)) = lower(v_name)
      and t.status <> 'archived'
  ) then
    raise exception 'team name already exists' using errcode = '23505';
  end if;

  v_base_slug := regexp_replace(
    lower(translate(
      v_name,
      'áàãâäéèêëíìîïóòõôöúùûüçñ',
      'aaaaaeeeeiiiiooooouuuucn'
    )),
    '[^a-z0-9]+',
    '-',
    'g'
  );
  v_base_slug := btrim(v_base_slug, '-');

  if v_base_slug = '' then
    raise exception 'team name cannot generate slug' using errcode = '23514';
  end if;

  v_slug := v_base_slug;
  while exists (select 1 from public.teams t where t.slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix::text;
  end loop;

  insert into public.teams(name, slug, short_name, primary_pole_id, status)
  values (v_name, v_slug, v_short_name, p_primary_pole_id, 'draft')
  returning * into v_team;

  return v_team;
end;
$$;

revoke all on function public.admin_create_team(text, uuid, text) from public;
grant execute on function public.admin_create_team(text, uuid, text) to authenticated;
