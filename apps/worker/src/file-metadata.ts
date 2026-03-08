import { createHash } from "node:crypto";
import type { Stats } from "node:fs";
import { basename } from "node:path";
import { fileTypeFromBuffer } from "file-type";
import { lookup } from "mime-types";

export function getFileNameFromPath(filePath: string) {
  return basename(filePath);
}

export function createContentHash(content: Buffer) {
  return createHash("sha256").update(content).digest("hex");
}

export function getLastModifiedAt(stats: Stats) {
  return stats.mtime instanceof Date ? stats.mtime : new Date(stats.mtimeMs);
}

export async function detectMimeType(filePath: string, content: Buffer) {
  const detectedMimeType = (await fileTypeFromBuffer(content))?.mime;
  if (detectedMimeType) {
    return detectedMimeType;
  }

  const lookedUpMimeType = lookup(filePath);
  return typeof lookedUpMimeType === "string" ? lookedUpMimeType : null;
}
