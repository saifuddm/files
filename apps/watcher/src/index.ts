import chokidar from "chokidar";
import { Queue, QueueEvents } from "bullmq";
import { getScanPaths } from "@files/db";
import {
  FILE_ADD_DELAY_MS,
  FILE_EVENTS_QUEUE_NAME,
  type FileAddJobData,
  type FileChangeJobData,
} from "@files/shared";

const fileQueue = new Queue<FileAddJobData | FileChangeJobData>(FILE_EVENTS_QUEUE_NAME);

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

const fileQueueEvents = new QueueEvents(FILE_EVENTS_QUEUE_NAME);

fileQueueEvents.on("completed", (job) => {
  console.log("Job completed", job);
  console.log("Return value:", job.returnvalue);
});

fileQueueEvents.on("waiting", (job) => {
  console.log("Job waiting", job);
});
