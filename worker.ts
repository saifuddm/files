// Worker for processing file events
import { Job, Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis({
    maxRetriesPerRequest: null,
});

const fileWorker = new Worker("file-events", async (job: Job) => {
    console.log(`Received job ${job.name}`);
    console.log(`Job data:`, job.data);
    return "Job completed";
}, {
    connection,
});


const scanWorker = new Worker("scan-operations", async (job: Job) => {
    if (job.name === "scan-init") {
        console.log(`Scanning ${job.data.path}`);
        console.log(`Ignored:`, job.data.ignored);
        // TODO: Implement scan-init logic
        return "Scan completed";
    }
    return "Scan operation not supported";
}, {
    connection,
});