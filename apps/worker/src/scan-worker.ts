import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { Job, Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { discoverChildScans, updateScanPathStatus } from "@files/db";
import {
  FILE_ADD_DELAY_MS,
  FILE_EVENTS_QUEUE_NAME,
  SCAN_OPERATIONS_QUEUE_NAME,
  type FileAddJobData,
  type ScanInitJobData,
} from "@files/shared";

const connection = new IORedis({
  maxRetriesPerRequest: null,
});

const fileQueue = new Queue<FileAddJobData>(FILE_EVENTS_QUEUE_NAME, {
  connection,
});

export const scanWorker = new Worker(
  SCAN_OPERATIONS_QUEUE_NAME,
  async (job: Job<ScanInitJobData>) => {
    if (job.name !== "scan-init") {
      return "Scan operation not supported";
    }

    await updateScanPathStatus(job.data.scanId, "scanning", false);

    console.log(`Scanning ${job.data.path}`);
    console.log("Ignored:", job.data.ignored);

    const entries = await readdir(job.data.path, { withFileTypes: true });
    const ignoredPatterns: RegExp[] = (job.data.ignored ?? []).flatMap(
      (pattern: string) => {
        try {
          return [new RegExp(pattern)];
        } catch (error) {
          console.warn(`Invalid ignored pattern: ${pattern}`, error);
          return [];
        }
      },
    );

    const entryDetails = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = join(job.data.path, entry.name);
        const ignored = ignoredPatterns.some(
          (pattern: RegExp) =>
            pattern.test(entry.name) || pattern.test(entryPath),
        );

        if (ignored) {
          return {
            name: entry.name,
            ignored,
            isFile: false,
            isDirectory: false,
          };
        }

        try {
          const entryStats = await stat(entryPath);

          return {
            name: entry.name,
            ignored,
            isFile: entryStats.isFile(),
            isDirectory: entryStats.isDirectory(),
          };
        } catch (error) {
          console.warn(`Could not stat ${entryPath}:`, error);
          return {
            name: entry.name,
            ignored: true,
            isFile: false,
            isDirectory: false,
          };
        }
      }),
    );

    const files = entryDetails
      .filter((entry) => entry.isFile && !entry.ignored)
      .map((entry) => entry.name);
    const directories = entryDetails
      .filter((entry) => entry.isDirectory && !entry.ignored)
      .map((entry) => entry.name);
    const ignoredEntries = entryDetails
      .filter((entry) => entry.ignored)
      .map((entry) => entry.name);

    console.log("Files:", files);
    console.log("Directories:", directories);
    console.log("Ignored entries:", ignoredEntries);

    await discoverChildScans({
      parentScanId: job.data.scanId,
      parentPath: job.data.path,
      ignored: job.data.ignored ?? [],
      directoryNames: directories,
    });

    for (const fileName of files) {
      const filePath = join(job.data.path, fileName);
      await fileQueue.add(
        "file-add",
        {
          scanId: job.data.scanId,
          path: filePath,
          event: "init",
        },
        {
          delay: FILE_ADD_DELAY_MS,
        },
      );
      console.log(
        `Enqueued file-add (delayed ${FILE_ADD_DELAY_MS}ms) for ${filePath}`,
      );
    }

    await updateScanPathStatus(job.data.scanId, "ready", true);

    return {
      path: job.data.path,
      files,
      directories,
      ignoredEntries,
    };
  },
  {
    connection,
  },
);
