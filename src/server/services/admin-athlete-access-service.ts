import type { AdminAthleteAccessSnapshot } from "@/features/admin-athlete-access/types";
import { fetchAdminAthleteAccessRepositoryData } from "@/server/repositories/admin-athlete-access-repository";

export async function getAdminAthleteAccessSnapshot(
  now = new Date(),
): Promise<AdminAthleteAccessSnapshot> {
  const raw = await fetchAdminAthleteAccessRepositoryData();
  if (raw.athletes === null) {
    return {
      athletes: null,
      metrics: {
        totalActive: null,
        linked: null,
        unlinked: null,
        activeInvites: null,
      },
      sourceErrors: raw.errors,
    };
  }

  const inviteByAthlete = new Map<
    string,
    NonNullable<typeof raw.invites>[number]
  >();
  for (const invite of raw.invites ?? []) {
    if (!inviteByAthlete.has(invite.athlete_id)) {
      inviteByAthlete.set(invite.athlete_id, invite);
    }
  }

  const nowMs = now.getTime();
  const athletes = raw.athletes.map((athlete) => {
    const invite = inviteByAthlete.get(athlete.id);
    const inviteActive = Boolean(
      invite &&
      !invite.used_at &&
      !invite.revoked_at &&
      new Date(invite.expires_at).getTime() > nowMs,
    );
    return {
      id: athlete.id,
      publicName: athlete.public_name,
      athleteCode: athlete.athlete_code,
      emailContact: athlete.email_contact,
      phone: athlete.phone,
      linked: Boolean(athlete.profile_id),
      inviteId: invite?.id ?? null,
      inviteExpiresAt: invite?.expires_at ?? null,
      inviteActive,
    };
  });

  return {
    athletes,
    metrics: {
      totalActive: athletes.length,
      linked: athletes.filter((athlete) => athlete.linked).length,
      unlinked: athletes.filter((athlete) => !athlete.linked).length,
      activeInvites: athletes.filter((athlete) => athlete.inviteActive).length,
    },
    sourceErrors: raw.errors,
  };
}
