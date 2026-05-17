export type PlannerModuleId =
  | "wedding"
  | "guests"
  | "budget"
  | "tasks"
  | "vendors"
  | "tables"
  | "notes"
  | "settings";

export interface BaseRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface ModuleLock {
  lockedBy: string;
  lockedAt: number;
  expiresAt: number;
}
