import { basename, join } from "node:path";
import { Queue } from "bullmq";
import { eq } from "drizzle-orm";
import {
  SCAN_OPERATIONS_QUEUE_NAME,
  type ScanInitJobData,
  type ScanStatus,
} from "@files/shared";
import { db } from "./client";
import { scansTable } from "./schema";

interface AddScanPathsProps {
  path: string;
  ignored: string[];
}

interface DiscoverChildScansProps {
  parentScanId: number;
  parentPath: string;
  ignored: string[];
  directoryNames: string[];
}

const scanQueue = new Queue<ScanInitJobData>(SCAN_OPERATIONS_QUEUE_NAME);

function getScanName(path: string) {
  return basename(path) || path;
}

// TODO: see if this would be better as just a single path instead of an array of paths
export async function addScanPaths(props: AddScanPathsProps[]) {
  const now = new Date();
  const scans: (typeof scansTable.$inferInsert)[] = props.map((prop) => ({
    parentScanId: null,
    path: prop.path,
    name: getScanName(prop.path),
    active: false,
    status: "pending",
    ignored: prop.ignored,
    approvedAt: now,
    createdAt: now,
    updatedAt: now,
  }));

  const result = await db
    .insert(scansTable)
    .values(scans)
    .onConflictDoUpdate({
      target: scansTable.path,
      set: {
        approvedAt: now,
        updatedAt: now,
        status: "pending",
      },
    })
    .returning();

  console.log("Scans:", result);

  for (const scan of result) {
    console.log("Scans Event being sent:", {
      scanId: scan.id,
      event: "init",
      path: scan.path,
      ignored: scan.ignored || [],
    });
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

export async function updateScanPathStatus(
  scanId: number,
  status: ScanStatus,
  active: boolean,
) {
  const now = new Date();
  const updates: Partial<typeof scansTable.$inferInsert> = {
    status,
    active,
    updatedAt: now,
  };

  if (status === "ready") {
    updates.scannedAt = now;
  }

  if (active) {
    updates.approvedAt = now;
  }

  return db.update(scansTable).set(updates).where(eq(scansTable.id, scanId));
}

export async function discoverChildScans(props: DiscoverChildScansProps) {
  if (props.directoryNames.length === 0) {
    return [];
  }

  const now = new Date();
  const scans: (typeof scansTable.$inferInsert)[] = props.directoryNames.map(
    (directoryName) => ({
      parentScanId: props.parentScanId,
      path: join(props.parentPath, directoryName),
      name: directoryName,
      active: false,
      status: "discovered",
      ignored: props.ignored,
      createdAt: now,
      updatedAt: now,
    }),
  );

  return db
    .insert(scansTable)
    .values(scans)
    .onConflictDoNothing({ target: scansTable.path })
    .returning();
}
