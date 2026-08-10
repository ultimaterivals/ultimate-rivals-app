export type AthleteAccessRow = {
  id: string;
  publicName: string;
  athleteCode: string;
  emailContact: string | null;
  phone: string | null;
  linked: boolean;
  inviteId: string | null;
  inviteExpiresAt: string | null;
  inviteActive: boolean;
};

export type AdminAthleteAccessSnapshot = {
  athletes: AthleteAccessRow[] | null;
  metrics: {
    totalActive: number | null;
    linked: number | null;
    unlinked: number | null;
    activeInvites: number | null;
  };
  sourceErrors: string[];
};
