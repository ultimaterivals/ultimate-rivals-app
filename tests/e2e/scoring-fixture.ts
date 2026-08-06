import { createClient } from "@supabase/supabase-js";

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for scoring E2E setup.`);
  return value;
};
const url = required("NEXT_PUBLIC_SUPABASE_URL"),
  key = required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  password = required("UR_TEST_PASSWORD"),
  reference = {
    admin: "a0000000-0000-4000-8000-000000000001",
    athlete: "b0000000-0000-4000-8000-000000000001",
    pole: "20000000-0000-4000-8000-000000000001",
    season: "10000000-0000-4000-8000-000000000001",
  };

async function signedIn(role: "admin" | "operator") {
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const { error } = await client.auth.signInWithPassword({
        email: `${role}@test.ur.local`,
        password,
      });
      if (!error) return client;
      lastError = error;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }
  throw lastError;
}

const assertOk = (response: { error: unknown }) => {
  if (response.error) throw response.error;
};

export async function createScoringE2EFixture(underReview: boolean) {
  const admin = await signedIn("admin"),
    operator = await signedIn("operator"),
    sessionId = crypto.randomUUID(),
    venueId = crypto.randomUUID(),
    courtId = crypto.randomUUID(),
    generated = Array.from({ length: 3 }, () => crypto.randomUUID()),
    startsAt = new Date(Date.now() + 86_400_000),
    endsAt = new Date(startsAt.getTime() + 7_200_000);
  const [{ data: operatorProfile }, { data: coordinatorProfile }] =
    await Promise.all([
      admin.from("profiles").select("id").eq("role", "operator").single(),
      admin.from("profiles").select("id").eq("role", "pole_manager").single(),
    ]);
  const { data: athlete } = await admin
    .from("athletes")
    .select("id,public_name,gender")
    .eq("id", reference.athlete)
    .single();
  const { data: level } = await admin
    .from("athlete_levels")
    .select("level")
    .eq("athlete_id", reference.athlete)
    .eq("status", "active")
    .limit(1)
    .single();
  const { data: format } = await admin
    .from("competitive_formats")
    .select("id")
    .eq("code", "doubles")
    .single();
  const { data: category } = await admin
    .from("competitive_categories")
    .select("id")
    .eq("code", "mixed")
    .single();
  const { data: seasonCycle } = await admin
    .from("season_cycles")
    .select("id")
    .eq("season_id", reference.season)
    .order("cycle_number")
    .limit(1)
    .single();
  if (
    !operatorProfile?.id ||
    !coordinatorProfile?.id ||
    !athlete?.id ||
    !level?.level ||
    !format?.id ||
    !category?.id ||
    !seasonCycle?.id
  )
    throw new Error("Scoring E2E reference data is incomplete.");

  for (const response of [
    await admin.from("venues").insert({
      id: venueId,
      name: `[TEST] E2E Scoring ${sessionId.slice(0, 6)}`,
      pole_id: reference.pole,
      city: "Test City",
      state: "SP",
      status: "active",
    }),
    await admin.from("courts").insert({
      id: courtId,
      venue_id: venueId,
      name: "[TEST] E2E Scoring Court",
      status: "active",
    }),
    await admin.from("athletes").insert([
      {
        id: generated[0],
        public_name: "[TEST] E2E Scoring Partner",
        full_name: "Fictitious E2E Scoring Partner",
        gender: athlete.gender === "female" ? "male" : "female",
        status: "active",
      },
      {
        id: generated[1],
        public_name: "[TEST] E2E Scoring Opponent F",
        full_name: "Fictitious E2E Scoring Opponent F",
        gender: "female",
        status: "active",
      },
      {
        id: generated[2],
        public_name: "[TEST] E2E Scoring Opponent M",
        full_name: "Fictitious E2E Scoring Opponent M",
        gender: "male",
        status: "active",
      },
    ]),
  ])
    assertOk(response);
  assertOk(
    await admin.from("athlete_levels").insert(
      generated.map((athlete_id) => ({
        athlete_id,
        season_id: reference.season,
        level: level.level,
        starts_at: new Date(Date.now() - 86_400_000).toISOString(),
        reason: "[TEST] Sprint 8 E2E",
        assigned_by: reference.admin,
      })),
    ),
  );
  assertOk(
    await admin.from("ur_play_sessions").insert({
      id: sessionId,
      season_id: reference.season,
      season_cycle_id: seasonCycle.id,
      pole_id: reference.pole,
      venue_id: venueId,
      name: `[TEST] Sprint 8 E2E ${sessionId.slice(0, 6)}`,
      session_date: startsAt.toISOString().slice(0, 10),
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      registration_opens_at: new Date(Date.now() - 3_600_000).toISOString(),
      registration_closes_at: new Date(Date.now() + 3_600_000).toISOString(),
      capacity: 4,
      waitlist_capacity: 1,
      status: "registration_open",
      created_by: reference.admin,
      min_rest_minutes: 5,
    }),
  );
  assertOk(
    await admin.from("ur_play_session_courts").insert({
      session_id: sessionId,
      court_id: courtId,
      position: 1,
    }),
  );
  assertOk(
    await admin.from("ur_play_session_staff").insert([
      {
        session_id: sessionId,
        profile_id: operatorProfile.id,
        role: "operator",
      },
      {
        session_id: sessionId,
        profile_id: coordinatorProfile.id,
        role: "coordinator",
      },
    ]),
  );

  const athletes = [athlete.id, generated[0], generated[1], generated[2]],
    registrations = [];
  for (const athleteId of athletes) {
    const response = await admin.rpc("register_ur_play", {
      target_session: sessionId,
      target_athlete: athleteId,
      target_source: "admin",
      operation_id: crypto.randomUUID(),
    });
    assertOk(response);
    registrations.push(response.data);
  }
  for (const status of ["registration_closed", "checkin_open"])
    assertOk(
      await admin.rpc("transition_ur_play_session", {
        target_session_id: sessionId,
        target_status: status,
        cancel_reason: null,
      }),
    );
  for (const registration of registrations)
    assertOk(
      await operator.rpc("checkin_ur_play", {
        target_registration: registration.id,
        checkin_method: "operator",
        operation_id: crypto.randomUUID(),
      }),
    );
  assertOk(
    await admin.rpc("transition_ur_play_session", {
      target_session_id: sessionId,
      target_status: "in_progress",
      cancel_reason: null,
    }),
  );
  const match = await operator.rpc("create_court_ops_match", {
    target_session: sessionId,
    target_court: courtId,
    target_format: format.id,
    target_category: category.id,
    target_level: level.level,
    side_a: athletes.slice(0, 2),
    side_b: athletes.slice(2, 4),
    operation_id: crypto.randomUUID(),
  });
  assertOk(match);
  for (const status of ["called", "ready", "in_progress"])
    assertOk(
      await operator.rpc("transition_court_ops_match", {
        target_match: match.data.id,
        target_status: status,
        reason: null,
        operation_id: crypto.randomUUID(),
      }),
    );
  const { data: side } = await operator
    .from("match_sides")
    .select("id")
    .eq("match_id", match.data.id)
    .eq("side", "A")
    .single();
  if (!side?.id) throw new Error("Scoring E2E side A missing.");
  if (underReview) {
    for (let sequence = 1; sequence <= 11; sequence += 1)
      assertOk(
        await operator.rpc("record_match_rally", {
          target_match: match.data.id,
          target_winning_side: side.id,
          expected_rally_number: sequence,
          client_sequence: sequence,
          client_recorded_at: null,
          operation_id: crypto.randomUUID(),
        }),
      );
    assertOk(
      await operator.rpc("submit_match_for_review", {
        target_match: match.data.id,
        operation_id: crypto.randomUUID(),
      }),
    );
  }
  return {
    matchId: match.data.id as string,
    athleteName: athlete.public_name,
  };
}
