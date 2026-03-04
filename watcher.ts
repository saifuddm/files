// Script for watching files and event producer

import chokidar from "chokidar";
import { Queue, QueueEvents } from "bullmq";
import { getScanPaths } from "./writer";

const fileQueue = new Queue("file-events");

const scanPaths = await getScanPaths();
const activeScans = scanPaths.filter((s) => s.active);

const watchers = activeScans.map((scan) => {
    const watcher = chokidar.watch(scan.path, {
        persistent: true,
        ignored: scan.ignored || [],
    });

    watcher.on("error", (error) => {
        console.error(`Error watching ${scan.path}:`, error);
    });

    return { scanId: scan.id, path: scan.path, watcher };
});

watchers.forEach(({ watcher, scanId }) => {
    watcher.on("add", async (path, stats) => {
        await fileQueue.add("file-add", {
            scanId,
            path,
            stats,
            event: "add",
        });
    });
});

watchers.forEach(({ watcher, scanId }) => {
    watcher.on("change", async (path, stats) => {
        await fileQueue.add("file-change", {
            scanId,
            path,
            stats,
        });
    });
});


// Queue Events
const fileQueueEvents = new QueueEvents("file-events");

// Completed Event
fileQueueEvents.on("completed", (job) => {
    console.log(`Job completed`, job);
    console.log(`Return value:`, job.returnvalue);
});

// Waiting Event
fileQueueEvents.on("waiting", (job) => {
    console.log(`Job waiting`, job);

})