// Script for watching files and event producer

import chokidar from "chokidar";
import { Job, Queue, QueueEvents } from "bullmq";
const fileQueue = new Queue("file-events");

const watcher = chokidar.watch("./test", {
    persistent: true,
})

// Listen for file add events
watcher.on("add", async (path, stats) => {
    await fileQueue.add("file-add", {
        path,
        stats,
        event: "add",
    });
});

// Listen for file change events
watcher.on("change", async (path, stats) => {
    await fileQueue.add("file-change", {
        path,
        stats,
        event: "change",
    });
})



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