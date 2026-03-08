export interface ScanInitJobData {
  scanId: number;
  event: "init";
  path: string;
  ignored: string[];
}

export interface FileAddJobData {
  scanId: number;
  path: string;
  event: "add" | "init";
  stats?: unknown;
}

export interface FileChangeJobData {
  scanId: number;
  path: string;
  event?: "change";
  stats?: unknown;
}
