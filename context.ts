// Worker for sending files to Ollama and getting AI summaries

import { readFile } from "node:fs/promises";
import type { Job } from "bullmq";
import IORedis from "ioredis";
import { Worker } from "bullmq";
import { Ollama } from "ollama";

const ollama = new Ollama();

const connection = new IORedis({
  maxRetriesPerRequest: null,
});

const fileWorker = new Worker(
  "file-events",
  async (job: Job) => {
    if (job.name === "file-add") {
      const filePath: string = job.data.path;
      console.log(`[file-add] Processing ${filePath} (source: ${job.data.event})`);

      let fileContent: string;
      try {
        fileContent = await readFile(filePath, "utf-8");
      } catch (err) {
        console.error(`[file-add] Could not read ${filePath}:`, err);
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

