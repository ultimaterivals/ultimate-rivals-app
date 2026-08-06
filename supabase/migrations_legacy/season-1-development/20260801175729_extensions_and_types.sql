create extension if not exists btree_gist;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.app_role as enum ('admin', 'operator', 'pole_manager', 'team_manager', 'athlete', 'public');
create type public.profile_status as enum ('active', 'suspended', 'archived');
create type public.athlete_status as enum ('draft', 'active', 'inactive', 'archived');
create type public.entity_status as enum ('draft', 'active', 'inactive', 'archived');
create type public.season_status as enum ('draft', 'registration', 'active', 'closing', 'closed', 'archived');
create type public.gender_type as enum ('female', 'male', 'non_binary', 'undisclosed');
create type public.dominant_hand_type as enum ('left', 'right', 'ambidextrous');
create type public.sport_type as enum ('beach_volleyball');
create type public.membership_type as enum ('athlete', 'captain');
create type public.temporal_status as enum ('active', 'inactive', 'cancelled');
create type public.athlete_level as enum ('leveling', 'n3', 'n2', 'n1');
create type public.roster_status as enum ('draft', 'active', 'inactive', 'archived');
create type public.roster_member_role as enum ('starter', 'reserve', 'captain');
create type public.access_scope_type as enum ('pole', 'team');

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
