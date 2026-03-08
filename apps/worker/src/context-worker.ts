import { readFile } from "node:fs/promises";
import { Job, Worker } from "bullmq";
import IORedis from "ioredis";
import { Ollama } from "ollama";
import {
  FILE_EVENTS_QUEUE_NAME,
  type FileAddJobData,
  type FileChangeJobData,
} from "@files/shared";

const ollama = new Ollama();

const connection = new IORedis({
  maxRetriesPerRequest: null,
});

type FileEventJobData = FileAddJobData | FileChangeJobData;

export const fileWorker = new Worker(
  FILE_EVENTS_QUEUE_NAME,
  async (job: Job<FileEventJobData>) => {
    if (job.name === "file-add") {
      const filePath = job.data.path;
      console.log(`[file-add] Processing ${filePath} (source: ${job.data.event})`);

      let fileContent: string;
      try {
        fileContent = await readFile(filePath, "utf-8");
      } catch (error) {
        console.error(`[file-add] Could not read ${filePath}:`, error);
        return { path: filePath, summary: null, error: "unreadable" };
      }

      if (!fileContent.trim()) {
        console.warn(`[file-add] File is empty: ${filePath}`);
        return { path: filePath, summary: null, error: "empty" };
      }

      const response = await ollama.chat({
        model: "qwen3.5:0.8b",
        think: false,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant. Given the contents of a file, respond with a concise 1-3 sentence summary describing what the file does or contains. Do not include any preamble.",
          },
          {
            role: "user",
            content: `File path: ${filePath}\n\nFile content:\n${fileContent}`,
          },
        ],
      });

      const summary = response.message.content;
      console.log(`[file-add] Summary for ${filePath}:\n${summary}`);
      return { path: filePath, summary };
    }

    if (job.name === "file-change") {
      console.log(`[file-change] ${job.data.path}`);
      return { path: job.data.path, event: "change" };
    }

    return "Job not supported";
  },
  {
    connection,
  },
);
