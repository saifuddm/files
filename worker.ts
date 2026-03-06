// Worker for processing scan operations
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { Job, Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { updateScanPathStatus } from "./writer";

const FILE_ADD_DELAY_MS = 60_000;

const connection = new IORedis({
    maxRetriesPerRequest: null,
});

const fileQueue = new Queue("file-events", { connection });

const scanWorker = new Worker("scan-operations", async (job: Job) => {
    if (job.name === "scan-init") {
        console.log(`Scanning ${job.data.path}`);
        console.log(`Ignored:`, job.data.ignored);
        const entries = await readdir(job.data.path, { withFileTypes: true });
        const ignoredPatterns: RegExp[] = (job.data.ignored ?? []).flatMap((pattern: string) => {
            try {
                return [new RegExp(pattern)];
            } catch (error) {
                console.warn(`Invalid ignored pattern: ${pattern}`, error);
                return [];
            }
        });
        const entryDetails = entries.map((entry) => {
            const entryPath = join(job.data.path, entry.name);
            const ignored = ignoredPatterns.some((pattern: RegExp) =>
                pattern.test(entry.name) || pattern.test(entryPath)
            );

            return {
                name: entry.name,
                ignored,
                isFile: entry.isFile(),
                isDirectory: entry.isDirectory(),
            };
        });
        const files = entryDetails
            .filter((entry) => entry.isFile && !entry.ignored)
            .map((entry) => entry.name);
        const directories = entryDetails
            .filter((entry) => entry.isDirectory && !entry.ignored)
            .map((entry) => entry.name);
        const ignoredEntries = entryDetails
            .filter((entry) => entry.ignored)
            .map((entry) => entry.name);

        console.log(`Files:`, files);
        console.log(`Directories:`, directories);
        console.log(`Ignored entries:`, ignoredEntries);

        for (const fileName of files) {
            const filePath = join(job.data.path, fileName);
            //TODO: send the surrounding directories and files as well so that the context can be more accurate
            fileQueue.add("file-add", {
                scanId: job.data.scanId,
                path: filePath,
                event: "init",
            }, {
                delay: FILE_ADD_DELAY_MS,
            });
            console.log(`Enqueued file-add (delayed ${FILE_ADD_DELAY_MS}ms) for ${filePath}`);
        }

        await updateScanPathStatus(job.data.scanId, "ready", true);

        return {
            path: job.data.path,
            files,
            directories,
            ignoredEntries,
        };
    }
    return "Scan operation not supported";
}, {
    connection,
});