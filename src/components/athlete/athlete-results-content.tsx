import { AthleteHistoricalResults } from "@/components/athlete/athlete-historical-results";
import { AthleteLiveResults } from "@/components/athlete/athlete-live-results";

export function AthleteResultsContent() {
  return (
    <div className="grid gap-6">
      <AthleteLiveResults />
      <AthleteHistoricalResults />
    </div>
  );
}
