export type AttendanceRegistration = {
  id: string;
  athleteId: string;
  athleteName: string;
  athleteCode: string;
  registrationStatus: string;
  attendanceStatus: string;
  paymentStatus: string;
  activityReservationId: string | null;
  activityStatus: string | null;
};

export type AttendanceSession = {
  id: string;
  name: string;
  status: string;
  startsAt: string;
  endsAt: string;
  venueName: string | null;
  capacity: number;
  registrations: AttendanceRegistration[];
  confirmedCount: number;
  checkedInCount: number;
  noShowCount: number;
  pendingAttendanceCount: number;
};

export type AdminAttendanceSnapshot = {
  sessions: AttendanceSession[] | null;
  sourceErrors: string[];
};
