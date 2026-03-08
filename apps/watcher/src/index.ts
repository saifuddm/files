import { basename } from "node:path";
import chokidar from "chokidar";
import { Queue, QueueEvents } from "bullmq";
import { discoverChildScans, getScanPaths } from "@files/db";
import {
  FILE_ADD_DELAY_MS,
  FILE_EVENTS_QUEUE_NAME,
  type FileAddJobData,
  type FileChangeJobData,
  type FileRemoveJobData,
} from "@files/shared";

const fileQueue = new Queue<
  FileAddJobData | FileChangeJobData | FileRemoveJobData
>(FILE_EVENTS_QUEUE_NAME);

const scanPaths = await getScanPaths();
const activeScans = scanPaths.filter((scan) => scan.active);
console.log("Active scans:", activeScans);

const watchers = activeScans.map((scan) => {
  const watcher = chokidar.watch(scan.path, {
    persistent: true,
    ignored: scan.ignored || [],
    depth: 0,
    ignoreInitial: true,
  });

  watcher.on("error", (error) => {
    console.error(`Error watching ${scan.path}:`, error);
  });

  return { scanId: scan.id, path: scan.path, watcher };
});

watchers.forEach(({ watcher, scanId }) => {
  watcher.on("add", async (path, stats) => {
    console.log("File added:", path);
    await fileQueue.add(
      "file-add",
      {
        scanId,
        path,
        stats,
        event: "add",
      },
      {
        delay: FILE_ADD_DELAY_MS,
      },
    );
  });
});

watchers.forEach(({ watcher, scanId }) => {
  watcher.on("change", async (path, stats) => {
    console.log("File changed:", path);
    await fileQueue.add("file-change", {
      scanId,
      path,
      stats,
      event: "change",
    });
  });
});

watchers.forEach(({ watcher, scanId }) => {
  watcher.on("unlink", async (path) => {
    console.log("File removed:", path);
    await fileQueue.add("file-remove", {
      scanId,
      path,
      event: "unlink",
    });
  });
});

watchers.forEach(({ watcher, scanId, path: scanPath }) => {
  watcher.on("addDir", async (path) => {
    const directoryName = basename(path);
    if (!directoryName || path === scanPath) {
      return;
    }

    console.log("Directory discovered:", path);
    const scan = activeScans.find((activeScan) => activeScan.id === scanId);
    if (!scan) {
      return;
    }

    await discoverChildScans({
      parentScanId: scan.id,
      parentPath: scan.path,
      ignored: scan.ignored ?? [],
      directoryNames: [directoryName],
    });
  });
});

const fileQueueEvents = new QueueEvents(FILE_EVENTS_QUEUE_NAME);

fileQueueEvents.on("completed", (job) => {
  console.log("Job completed", job);
  console.log("Return value:", job.returnvalue);
});

fileQueueEvents.on("waiting", (job) => {
  console.log("Job waiting", job);
});
