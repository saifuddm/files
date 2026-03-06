//ScratchPad for testing

import { Queue } from "bullmq";
import { addScanPaths } from "./writer";


// const scanQueue = new Queue("scan-operations");
// const jobs = await scanQueue.getJobs();
// console.log(jobs);



addScanPaths([{
    path: "C:\\Users\\murta\\Documents\\Obsidian\\Keepsake",
    ignored: [],
}])


// const fileQueue = new Queue("file-events");

// await fileQueue.add("file-add", {
//     path: "/mnt/c/Users/murta/Documents/Obsidian/Keepsake/README.md",
//     event: "add",
// });

// C:\Users\murta\Documents\Obsidian\Keepsake\README.md

// await fileQueue.add("file-add", {
//     path: "C:\\Users\\murta\\Documents\\Obsidian\\Keepsake\\README.md",
//     event: "add",
// });