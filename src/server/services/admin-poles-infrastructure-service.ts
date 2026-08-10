import { fetchAdminPolesInfrastructureData } from "@/server/repositories/admin-poles-infrastructure-repository";

export async function getAdminPolesInfrastructureSnapshot() {
  const data = await fetchAdminPolesInfrastructureData();
  const venues = data.venues ?? [];
  const courts = data.courts ?? [];
  const courtsByVenue = new Map<string, typeof courts>();
  for (const court of courts) {
    const list = courtsByVenue.get(court.venue_id) ?? [];
    list.push(court);
    courtsByVenue.set(court.venue_id, list);
  }

  const poles = (data.poles ?? []).map((pole) => {
    const poleVenues = venues.filter((venue) => venue.pole_id === pole.id);
    const poleCourts = poleVenues.flatMap(
      (venue) => courtsByVenue.get(venue.id) ?? [],
    );
    const activeVenues = poleVenues.filter((venue) => venue.status === "active");
    const activeCourts = poleCourts.filter((court) => court.status === "active");
    const infrastructureReady =
      activeVenues.length > 0 && activeCourts.length > 0;

    return {
      id: pole.id,
      name: pole.name,
      slug: pole.slug,
      city: pole.city,
      state: pole.state,
      regionStatus: pole.status,
      regionActive: pole.status === "active",
      venues: poleVenues,
      courts: poleCourts,
      venueCount: poleVenues.length,
      courtCount: poleCourts.length,
      activeVenueCount: activeVenues.length,
      activeCourtCount: activeCourts.length,
      infrastructureReady,
    };
  });

  return {
    poles,
    metrics: {
      regions: poles.length,
      activeRegions: poles.filter((pole) => pole.regionActive).length,
      infrastructureReady: poles.filter((pole) => pole.infrastructureReady).length,
      venues: venues.length,
      courts: courts.length,
      activeVenues: venues.filter((venue) => venue.status === "active").length,
      activeCourts: courts.filter((court) => court.status === "active").length,
    },
    sourceErrors: data.errors,
  };
}
