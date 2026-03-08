export const scanStatuses = [
  "pending",
  "discovered",
  "scanning",
  "ready",
  "failed",
] as const;
export type ScanStatus = (typeof scanStatuses)[number];

export const fileContextStatuses = ["pending", "ready", "failed"] as const;
export type FileContextStatus = (typeof fileContextStatuses)[number];
