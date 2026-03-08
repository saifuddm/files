import { readFile, stat } from "node:fs/promises";
import { Job, Worker } from "bullmq";
import IORedis from "ioredis";
import {
  createFileEntry,
  getFileEntry,
  markFileDeleted,
  markFileEnhancementFailed,
  markFileEnhancementPending,
  saveFileEnhancement,
  updateFileObservedMetadata,
} from "@files/db";
import {
  FILE_EVENTS_QUEUE_NAME,
  type FileAddJobData,
  type FileChangeJobData,
  type FileRemoveJobData,
} from "@files/shared";
import {
  createContentHash,
  detectMimeType,
  getFileNameFromPath,
  getLastModifiedAt,
} from "./file-metadata";
import { enhanceFileContent } from "./file-enhancement";

const connection = new IORedis({
  maxRetriesPerRequest: null,
});

type FileEventJobData = FileAddJobData | FileChangeJobData | FileRemoveJobData;

export const fileWorker = new Worker(
  FILE_EVENTS_QUEUE_NAME,
  async (job: Job<FileEventJobData>) => {
    if (job.name === "file-add") {
      const filePath = job.data.path;
      const fileName = getFileNameFromPath(filePath);
      console.log(
        `[file-add] Processing ${filePath} (source: ${job.data.event})`,
      );

      const fileEntry = await createFileEntry({
        scanId: job.data.scanId,
        name: fileName,
      });
      if (!fileEntry[0]) {
        console.error(`[file-add] Could not create file entry for ${filePath}`);
        return {
          path: filePath,
          summary: null,
          error: "file_entry_creation_failed",
        };
      }
      await markFileEnhancementPending(fileEntry[0].id);

      let fileStats;
      try {
        fileStats = await stat(filePath);
        updateFileObservedMetadata({
          fileId: fileEntry[0].id,
          updates: {
            sizeBytes: fileStats.size,
            lastModifiedAt: getLastModifiedAt(fileStats),
          },
        });
      } catch (error) {
        console.error(`[file-add] Could not stat ${filePath}:`, error);
        await markFileEnhancementFailed(fileEntry[0].id, "unreadable");
        return { path: filePath, summary: null, error: "unreadable" };
      }

      let fileContent: Buffer;
      try {
        fileContent = await readFile(filePath);
      } catch (error) {
        console.error(`[file-add] Could not read ${filePath}:`, error);
        await markFileEnhancementFailed(fileEntry[0].id, "unreadable");
        return { path: filePath, summary: null, error: "unreadable" };
      }

      const contentHash = createContentHash(fileContent);
      const mimeType = await detectMimeType(filePath, fileContent);
      await updateFileObservedMetadata({
        fileId: fileEntry[0].id,
        updates: {
          contentHash,
          mimeType,
        },
      });

      const isClearlyUnsupportedMimeType =
        mimeType !== null &&
        !mimeType.startsWith("text/") &&
        mimeType !== "application/json" &&
        mimeType !== "application/javascript" &&
        mimeType !== "application/xml";

      if (isClearlyUnsupportedMimeType) {
        console.log(
          `[file-add] Skipping unsupported mime type ${mimeType}: ${filePath}`,
        );
        await markFileEnhancementFailed(fileEntry[0].id, "unsupported_content");
        return { path: filePath, summary: null, error: "unsupported_content" };
      }

      const fileText = fileContent.toString("utf-8");
      if (!fileText.trim()) {
        console.warn(`[file-add] File is empty: ${filePath}`);
        await markFileEnhancementFailed(fileEntry[0].id, "empty");
        return { path: filePath, summary: null, error: "empty" };
      }

      try {
        const enhancement = await enhanceFileContent({
          filePath,
          fileText,
        });
        await saveFileEnhancement({
          scanId: job.data.scanId,
          name: fileName,
          generatedSummary: enhancement.summary,
          enhancementModel: enhancement.model,
        });
        console.log(
          `[file-add] Summary for ${filePath}:\n${enhancement.summary}`,
        );
        return { path: filePath, summary: enhancement.summary };
      } catch (error) {
        console.error(`[file-add] Could not enhance ${filePath}:`, error);
        await markFileEnhancementFailed(fileEntry[0].id, "enhancement_failed");
        return { path: filePath, summary: null, error: "enhancement_failed" };
      }
    }

    if (job.name === "file-change") {
      const filePath = job.data.path;
      const fileName = getFileNameFromPath(filePath);
      console.log(`[file-change] ${filePath}`);

      const fileEntry = await getFileEntry(job.data.scanId, fileName);

      if (!fileEntry) {
        console.error(`[file-change] Could not find entry for ${filePath}`);
        return { path: filePath, event: "change", missing: true };
      }

      await updateFileObservedMetadata({
        fileId: fileEntry.id,
        updates: {
          lastModifiedAt: new Date(),
        },
      });

      await markFileEnhancementPending(fileEntry.id);

      return { path: filePath, event: "change", updated: true };
    }

    if (job.name === "file-remove") {
      const filePath = job.data.path;
      const fileName = getFileNameFromPath(filePath);
      console.log(`[file-remove] ${filePath}`);

      const fileEntry = await getFileEntry(job.data.scanId, fileName);
      if (!fileEntry) {
        console.error(`[file-remove] Could not find entry for ${filePath}`);
        return { path: filePath, event: "unlink", missing: true };
      }
      await markFileDeleted(fileEntry.id);
      console.log(`[file-remove] ${filePath}`);
      return { path: filePath, event: "unlink" };
    }

    return "Job not supported";
  },
  {
    connection,
  },
);
