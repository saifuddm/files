import { Queue } from "bullmq";
import { eq } from "drizzle-orm";
import { SCAN_OPERATIONS_QUEUE_NAME, type ScanInitJobData } from "@files/shared";
import { db } from "./client";
import { scansTable } from "./schema";

interface AddScanPathsProps {
  path: string;
  ignored: string[];
}

const scanQueue = new Queue<ScanInitJobData>(SCAN_OPERATIONS_QUEUE_NAME);

export async function addScanPaths(props: AddScanPathsProps[]) {
  const scans: typeof scansTable.$inferInsert[] = props.map((prop) => ({
    path: prop.path,
    active: false,
    status: "pending",
    ignored: prop.ignored,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const result = await db.insert(scansTable).values(scans).returning();

  for (const scan of result) {
    await scanQueue.add("scan-init", {
      scanId: scan.id,
      event: "init",
      path: scan.path,
      ignored: scan.ignored || [],
    });
  }

  return result;
}

export async function getScanPaths() {
  return db.select().from(scansTable);
}

export async function updateScanPathStatus(scanId: number, status: string, active: boolean) {
  return db.update(scansTable).set({ status, active }).where(eq(scansTable.id, scanId));
}
