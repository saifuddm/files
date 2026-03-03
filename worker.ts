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