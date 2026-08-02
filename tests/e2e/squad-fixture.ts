import { createClient } from "@supabase/supabase-js";

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for squad E2E setup.`);
  return value;
};
const url = required("NEXT_PUBLIC_SUPABASE_URL"),
  key = required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  password = required("UR_TEST_PASSWORD"),
  ids = {
    admin: "a0000000-0000-4000-8000-000000000001",
    athlete: "b0000000-0000-4000-8000-000000000001",
    pole: "20000000-0000-4000-8000-000000000001",
    season: "10000000-0000-4000-8000-000000000001",
  };

async function signedIn(role: "admin" | "operator") {
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: `${role}@test.ur.local`,
    password,
  });
  if (error) throw error;
  return client;
}

export async function createSquadE2EFixture() {
  const admin = await signedIn("admin"),
    operator = await signedIn("operator"),
    sessionId = crypto.randomUUID(),
    venueId = crypto.randomUUID(),
    courts = Array.from({ length: 3 }, () => crypto.randomUUID()),
    generated = Array.from({ length: 16 }, () => crypto.randomUUID()),
    startsAt = new Date(Date.now() + 86_400_000),
    endsAt = new Date(startsAt.getTime() + 10_800_000);
  const { data: operatorProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "operator")
    .single();
  const { data: athlete } = await admin
    .from("athletes")
    .select("id,public_name,gender")
    .eq("id", ids.athlete)
    .single();
  const { data: athleteLevel } = await admin
    .from("athlete_levels")
    .select("level")
    .eq("athlete_id", ids.athlete)
    .eq("season_id", ids.season)
    .eq("status", "active")
    .limit(1)
    .single();
  const { data: fours } = await admin
    .from("competitive_formats")
    .select("id")
    .eq("code", "fours")
    .single();
  const { data: female } = await admin
    .from("competitive_categories")
    .select("id")
    .eq("code", "female")
    .single();
  const { data: mixed } = await admin
    .from("competitive_categories")
    .select("id")
    .eq("code", "mixed")
    .single();
  if (
    !operatorProfile?.id ||
    !athlete?.id ||
    !athleteLevel?.level ||
    !fours?.id ||
    !female?.id ||
    !mixed?.id
  )
    throw new Error("Squad E2E reference data is incomplete.");

  const insertions = [
    await admin.from("venues").insert({
      id: venueId,
      name: `[TEST] E2E Squad ${sessionId.slice(0, 6)}`,
      pole_id: ids.pole,
      city: "Test City",
      state: "SP",
      status: "active",
    }),
    await admin.from("courts").insert(
      courts.map((id, index) => ({
        id,
        venue_id: venueId,
        name: `[TEST] E2E Squad Court ${index + 1}`,
        status: "active",
      })),
    ),
    await admin.from("athletes").insert(
      generated.map((id, index) => ({
        id,
        public_name: `[TEST] E2E Squad Player ${index + 1}`,
        full_name: `Fictitious E2E Squad Player ${index + 1}`,
        gender: index % 2 === 0 ? "female" : "male",
        status: "active",
      })),
    ),
  ];
  for (const insertion of insertions)
    if (insertion.error) throw insertion.error;
  const levelInsert = await admin.from("athlete_levels").insert(
    generated.map((athlete_id) => ({
      athlete_id,
      season_id: ids.season,
      level: athleteLevel.level,
      starts_at: new Date(Date.now() - 86_400_000).toISOString(),
      reason: "[TEST] Sprint 7.1 E2E",
      assigned_by: ids.admin,
    })),
  );
  if (levelInsert.error) throw levelInsert.error;
  const sessionInsert = await admin.from("ur_play_sessions").insert({
    id: sessionId,
    season_id: ids.season,
    pole_id: ids.pole,
    venue_id: venueId,
    name: `[TEST] Sprint 7.1 E2E ${sessionId.slice(0, 6)}`,
    session_date: startsAt.toISOString().slice(0, 10),
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    registration_opens_at: new Date(Date.now() - 3_600_000).toISOString(),
    registration_closes_at: new Date(Date.now() + 3_600_000).toISOString(),
    capacity: 17,
    waitlist_capacity: 2,
    status: "registration_open",
    created_by: ids.admin,
    min_rest_minutes: 10,
  });
  if (sessionInsert.error) throw sessionInsert.error;
  const sessionSetup = [
    await admin.from("ur_play_session_courts").insert(
      courts.map((court_id, index) => ({
        session_id: sessionId,
        court_id,
        position: index + 1,
      })),
    ),
    await admin.from("ur_play_session_staff").insert({
      session_id: sessionId,
      profile_id: operatorProfile.id,
      role: "operator",
    }),
  ];
  for (const setup of sessionSetup) if (setup.error) throw setup.error;

  const registrations = [];
  for (const athleteId of [...generated, athlete.id]) {
    const registration = await admin.rpc("register_ur_play", {
      target_session: sessionId,
      target_athlete: athleteId,
      target_source: "admin",
      operation_id: crypto.randomUUID(),
    });
    if (registration.error) throw registration.error;
    registrations.push(registration.data);
  }
  for (const status of ["registration_closed", "checkin_open"]) {
    const transition = await admin.rpc("transition_ur_play_session", {
      target_session_id: sessionId,
      target_status: status,
      cancel_reason: null,
    });
    if (transition.error) throw transition.error;
  }
  for (const registration of registrations) {
    const checkin = await operator.rpc("checkin_ur_play", {
      target_registration: registration.id,
      checkin_method: "operator",
      operation_id: crypto.randomUUID(),
    });
    if (checkin.error) throw checkin.error;
  }
  const start = await admin.rpc("transition_ur_play_session", {
    target_session_id: sessionId,
    target_status: "in_progress",
    cancel_reason: null,
  });
  if (start.error) throw start.error;

  const sameGenderStarterIndex = athlete.gender === "female" ? 0 : 1;
  return {
    sessionId,
    courts,
    generated,
    athleteId: athlete.id,
    athleteName: athlete.public_name,
    sameGenderStarterName: `[TEST] E2E Squad Player ${sameGenderStarterIndex + 1}`,
    level: athleteLevel.level,
    foursId: fours.id,
    femaleId: female.id,
    mixedId: mixed.id,
  };
}
