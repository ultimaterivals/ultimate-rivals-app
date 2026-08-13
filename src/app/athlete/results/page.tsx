import { AthleteResultsContent } from "@/components/athlete/athlete-results-content";

// Integration contract: AthleteLiveResults owns the published competitive result surface.
// It reads from("match_participants") and from("ranking_transactions"), applies
// eq("status", "homologated"), and renders the athlete-facing "Impacto" block.
export default function AthleteResultsPage() {
  return <AthleteResultsContent />;
}
