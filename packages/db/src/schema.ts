import { fileContextStatuses, scanStatuses } from "@files/shared";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const scanStatusEnum = pgEnum("scan_status", scanStatuses);
export const fileContextStatusEnum = pgEnum(
  "file_context_status",
  fileContextStatuses,
);

export const scansTable = pgTable(
  "scans",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    parentScanId: integer().references((): AnyPgColumn => scansTable.id),
    path: text().notNull(),
    name: text().notNull(),
    active: boolean().notNull().default(false),
    status: scanStatusEnum().notNull().default("pending"),
    ignored: text().array(),
    approvedAt: timestamp(),
    scannedAt: timestamp(),
    createdAt: timestamp().notNull(),
    updatedAt: timestamp().notNull(),
  },
  (table) => [
    uniqueIndex("scans_path_unique_idx").on(table.path),
    index("scans_parent_scan_id_idx").on(table.parentScanId),
    index("scans_active_idx").on(table.active),
  ],
);

export const filesTable = pgTable(
  "files",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    scanId: integer()
      .notNull()
      .references(() => scansTable.id),
    name: text().notNull(),
    mimeType: text(),
    sizeBytes: integer().notNull().default(0),
    contentHash: text(),
    lastModifiedAt: timestamp().notNull(),
    deletedAt: timestamp(),
    contextStatus: fileContextStatusEnum().notNull().default("pending"),
    generatedName: text(),
    generatedSummary: text(),
    generatedTags: text().array(),
    enhancedAt: timestamp(),
    enhancementModel: text(),
    enhancementError: text(),
    createdAt: timestamp().notNull(),
    updatedAt: timestamp().notNull(),
  },
  (table) => [
    uniqueIndex("files_scan_id_name_unique_idx").on(table.scanId, table.name),
    index("files_scan_id_idx").on(table.scanId),
    index("files_deleted_at_idx").on(table.deletedAt),
  ],
);
