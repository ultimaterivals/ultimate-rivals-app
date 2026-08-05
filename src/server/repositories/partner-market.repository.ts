import type { SupabaseClient } from "@supabase/supabase-js";

export async function listVenuePartnerOperations(client: SupabaseClient) {
  const [venues, partnerships, availability, rates, rules] = await Promise.all([
    client
      .from("admin_venue_partner_operations")
      .select("*")
      .order("pole_name"),
    client
      .from("venue_partnerships")
      .select("*,venues(name),poles(name)")
      .order("created_at", { ascending: false }),
    client.from("venue_availability").select("*,venues(name)").order("weekday"),
    client.from("venue_rates").select("*,venues(name)").order("starts_at"),
    client
      .from("venue_commercial_rules")
      .select("*,venues(name)")
      .order("created_at", { ascending: false }),
  ]);

  for (const response of [venues, partnerships, availability, rates, rules]) {
    if (response.error) throw response.error;
  }

  return {
    venues: venues.data ?? [],
    partnerships: partnerships.data ?? [],
    availability: availability.data ?? [],
    rates: rates.data ?? [],
    rules: rules.data ?? [],
  };
}

export async function getVenuePartnerDetail(
  client: SupabaseClient,
  venueId: string,
) {
  const [venue, partnerships, availability, rates, rules, events] =
    await Promise.all([
      client
        .from("admin_venue_partner_operations")
        .select("*")
        .eq("venue_id", venueId)
        .maybeSingle(),
      client.from("venue_partnerships").select("*").eq("venue_id", venueId),
      client.from("venue_availability").select("*").eq("venue_id", venueId),
      client.from("venue_rates").select("*").eq("venue_id", venueId),
      client.from("venue_commercial_rules").select("*").eq("venue_id", venueId),
      client.from("partner_events").select("*").eq("venue_id", venueId),
    ]);

  for (const response of [
    venue,
    partnerships,
    availability,
    rates,
    rules,
    events,
  ]) {
    if (response.error) throw response.error;
  }

  return {
    venue: venue.data,
    partnerships: partnerships.data ?? [],
    availability: availability.data ?? [],
    rates: rates.data ?? [],
    rules: rules.data ?? [],
    events: events.data ?? [],
  };
}

export async function listPartnerEvents(client: SupabaseClient) {
  const { data, error } = await client
    .from("admin_partner_event_operations")
    .select("*")
    .order("starts_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listSponsorOperations(client: SupabaseClient) {
  const [sponsors, agreements, assets, activations, deliveries, shares] =
    await Promise.all([
      client.from("admin_sponsor_operations").select("*").order("name"),
      client
        .from("sponsorship_agreements")
        .select("*,sponsors(name)")
        .order("created_at", { ascending: false }),
      client
        .from("sponsorship_assets")
        .select("*,sponsorship_agreements(name)")
        .order("created_at", { ascending: false }),
      client
        .from("sponsorship_activations")
        .select("*,sponsorship_agreements(name)")
        .order("created_at", { ascending: false }),
      client
        .from("sponsorship_deliveries")
        .select("*,sponsorship_agreements(name)")
        .order("due_at", { ascending: true }),
      client.from("sponsor_venue_share_summary").select("*"),
    ]);

  for (const response of [
    sponsors,
    agreements,
    assets,
    activations,
    deliveries,
    shares,
  ]) {
    if (response.error) throw response.error;
  }

  return {
    sponsors: sponsors.data ?? [],
    agreements: agreements.data ?? [],
    assets: assets.data ?? [],
    activations: activations.data ?? [],
    deliveries: deliveries.data ?? [],
    shares: shares.data ?? [],
  };
}

export async function listMarketAdmin(client: SupabaseClient) {
  const [partners, items, offers, redemptions] = await Promise.all([
    client.from("market_partners").select("*").order("category"),
    client.from("market_items").select("*,market_partners(name)").order("name"),
    client.from("market_offers").select("*,market_items(name)").order("name"),
    client
      .from("market_redemptions")
      .select("*,market_offers(name),athletes(public_name,athlete_code)")
      .order("created_at", { ascending: false }),
  ]);

  for (const response of [partners, items, offers, redemptions]) {
    if (response.error) throw response.error;
  }

  return {
    partners: partners.data ?? [],
    items: items.data ?? [],
    offers: offers.data ?? [],
    redemptions: redemptions.data ?? [],
  };
}

export async function listPublicMarketOffers(client: SupabaseClient) {
  const { data, error } = await client
    .from("public_market_offers")
    .select("*")
    .order("category");
  if (error) throw error;
  return data ?? [];
}
