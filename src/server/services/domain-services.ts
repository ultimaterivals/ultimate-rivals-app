import type { SupabaseClient } from "@supabase/supabase-js";
import { assertAnyRole } from "@/lib/auth/authorization";
import {
  addRosterMemberSchema,
  assignLevelSchema,
  createAthleteSchema,
  createMembershipSchema,
  createPoleSchema,
  createRosterSchema,
  createSeasonSchema,
  createTeamSchema,
} from "@/lib/validation/domain";
import type { SessionIdentity } from "@/lib/auth/session";
import * as athletesRepository from "@/server/repositories/athletes.repository";
import * as levelsRepository from "@/server/repositories/levels.repository";
import * as membershipsRepository from "@/server/repositories/memberships.repository";
import * as polesRepository from "@/server/repositories/poles.repository";
import * as rostersRepository from "@/server/repositories/rosters.repository";
import * as seasonsRepository from "@/server/repositories/seasons.repository";
import * as teamsRepository from "@/server/repositories/teams.repository";

function requireAdmin(actor: SessionIdentity) {
  assertAnyRole(actor.role, ["admin"]);
}
export async function createAthlete(
  client: SupabaseClient,
  actor: SessionIdentity,
  input: unknown,
) {
  requireAdmin(actor);
  return athletesRepository.insertAthlete(
    client,
    createAthleteSchema.parse(input),
  );
}
export async function createPole(
  client: SupabaseClient,
  actor: SessionIdentity,
  input: unknown,
) {
  requireAdmin(actor);
  return polesRepository.insertPole(client, createPoleSchema.parse(input));
}
export async function createTeam(
  client: SupabaseClient,
  actor: SessionIdentity,
  input: unknown,
) {
  requireAdmin(actor);
  return teamsRepository.insertTeam(client, createTeamSchema.parse(input));
}
export async function createSeason(
  client: SupabaseClient,
  actor: SessionIdentity,
  input: unknown,
) {
  requireAdmin(actor);
  return seasonsRepository.insertSeason(
    client,
    createSeasonSchema.parse(input),
  );
}
export async function createMembership(
  client: SupabaseClient,
  actor: SessionIdentity,
  input: unknown,
) {
  requireAdmin(actor);
  return membershipsRepository.insertMembership(
    client,
    createMembershipSchema.parse(input),
    actor.userId,
  );
}
export async function assignLevel(
  client: SupabaseClient,
  actor: SessionIdentity,
  input: unknown,
) {
  requireAdmin(actor);
  return levelsRepository.insertLevel(
    client,
    assignLevelSchema.parse(input),
    actor.userId,
  );
}
export async function createRoster(
  client: SupabaseClient,
  actor: SessionIdentity,
  input: unknown,
) {
  requireAdmin(actor);
  return rostersRepository.insertRoster(
    client,
    createRosterSchema.parse(input),
  );
}
export async function addRosterMember(
  client: SupabaseClient,
  actor: SessionIdentity,
  input: unknown,
) {
  requireAdmin(actor);
  return rostersRepository.insertRosterMember(
    client,
    addRosterMemberSchema.parse(input),
  );
}
