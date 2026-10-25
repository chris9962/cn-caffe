export type ShiftStatus = "open" | "missing_checkout" | "pending_review" | "valid" | "rejected";

export type FailReason = "outside_radius" | "location_unavailable" | "too_long";

export type Shift = {
  id: string;
  employeeId: string;
  employeeName: string;
  branchId: string;
  branchName: string;
  workDate: string;
  status: ShiftStatus;
  source: "check_in" | "manual";
  checkInAt: string;
  checkOutAt: string | null;
  checkInDistanceM: number | null;
  checkInAccuracyM: number | null;
  checkOutDistanceM: number | null;
  checkOutAccuracyM: number | null;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  failReasons: FailReason[];
  checkInPhotoUrl: string | null;
  checkOutPhotoUrl: string | null;
};

export type AuditLog = {
  id: number;
  actorName: string | null;
  action: string;
  createdAt: string;
  before: unknown;
  after: unknown;
};
