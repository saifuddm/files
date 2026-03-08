import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const scansTable = pgTable("scans", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  path: text().notNull().unique(),
  active: boolean().notNull().default(false),
  status: text(),
  ignored: text().array(),
  createdAt: timestamp().notNull(),
  updatedAt: timestamp().notNull(),
});


export const filesTable = pgTable("files",{
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  location_id: integer().references(() => scansTable.id),
  original_name: text().notNull(),
  mime_type: text().notNull(),
  file_size: integer().notNull(),
  hash: text().notNull(),
  created_at: timestamp().notNull(),
  // AI Fields
  is_enhanced: boolean().notNull().default(false),
  enhanced_name: text(),
  enhanced_summary: text(),
  enhanced_tags: text().array(),
  enhanced_created_at: timestamp(),
  enhanced_updated_at: timestamp(),
})