import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";


export const scansTable = pgTable("scans", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    path: text().notNull().unique(),
    active: boolean(),
    status: text(),
    ignored: text().array(),
    createdAt: timestamp().notNull(),
    updatedAt: timestamp().notNull(),
})

// After table creation, run the following command to create the table:
// bunx drizzle-kit push