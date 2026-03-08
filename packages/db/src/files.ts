import { and, eq } from "drizzle-orm";
import { db } from "./client";
import { filesTable } from "./schema";

export interface SaveFileEnhancementProps {
  scanId: number;
  name: string;
  generatedName?: string | null;
  generatedSummary: string;
  generatedTags?: string[] | null;
  enhancementModel?: string | null;
}

interface CreateFileEntryProps {
  scanId: number;
  name: string;
}

export async function getFileEntry(scanId: number, name: string) {
  const entry = await db
    .select()
    .from(filesTable)
    .where(and(eq(filesTable.scanId, scanId), eq(filesTable.name, name)))
    .limit(1);
  return entry[0];
}

export async function createFileEntry(props: CreateFileEntryProps) {
  const now = new Date();

  return db
    .insert(filesTable)
    .values({
      scanId: props.scanId,
      name: props.name,
      mimeType: null,
      sizeBytes: 0,
      contentHash: null,
      lastModifiedAt: now,
      contextStatus: "pending",
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: [filesTable.scanId, filesTable.name] })
    .returning();
}

export async function updateFileObservedMetadata({
  fileId,
  updates,
}: {
  fileId: number;
  updates: Partial<typeof filesTable.$inferInsert>;
}) {
  return db
    .update(filesTable)
    .set(updates)
    .where(and(eq(filesTable.id, fileId)));
}

export async function markFileDeleted(fileId: number) {
  const now = new Date();

  return db
    .update(filesTable)
    .set({
      deletedAt: now,
      updatedAt: now,
    })
    .where(eq(filesTable.id, fileId));
}

export async function saveFileEnhancement(props: SaveFileEnhancementProps) {
  const now = new Date();

  return db
    .update(filesTable)
    .set({
      contextStatus: "ready",
      generatedName: props.generatedName ?? null,
      generatedSummary: props.generatedSummary,
      generatedTags: props.generatedTags ?? null,
      enhancedAt: now,
      enhancementModel: props.enhancementModel ?? null,
      enhancementError: null,
      updatedAt: now,
    })
    .where(
      and(eq(filesTable.scanId, props.scanId), eq(filesTable.name, props.name)),
    );
}

export async function markFileEnhancementPending(fileId: number) {
  return db
    .update(filesTable)
    .set({
      contextStatus: "pending",
      enhancementError: null,
      updatedAt: new Date(),
    })
    .where(eq(filesTable.id, fileId));
}

export async function markFileEnhancementFailed(fileId: number, error: string) {
  return db
    .update(filesTable)
    .set({
      contextStatus: "failed",
      enhancementError: error,
      updatedAt: new Date(),
    })
    .where(eq(filesTable.id, fileId));
}
