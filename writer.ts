import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { scansTable } from './db/schema';
import { Queue } from 'bullmq';

const db = drizzle(process.env.DATABASE_URL!);
const scanQueue = new Queue("scan-operations");


interface AddScanPathsProps {
    path: string;
    ignored: string[];
}
// Write scaned file to database
export async function addScanPaths(props: AddScanPathsProps[]) {
    const scans: typeof scansTable.$inferInsert[] = props.map((prop) => ({
        path: prop.path,
        active: false,
        status: "pending",
        ignored: prop.ignored,
        createdAt: new Date(),
        updatedAt: new Date(),
    }));
    const result = await db.insert(scansTable).values(scans).returning();

    result.forEach(async (scan) => {
        await scanQueue.add("scan-init", {
            scanId: scan.id,
            event: "init",
            path: scan.path,
            ignored: scan.ignored || [],
        });
    });
    return result;
}

// Get all scan paths
export async function getScanPaths() {
    const result = await db.select().from(scansTable);
    console.log(result);
    return result;
}

// Update scan path status and active
export async function updateScanPathStatus(scanId: number, status: string, active: boolean) {
    const result = await db.update(scansTable).set({ status, active }).where(eq(scansTable.id, scanId));
    return result;
}

// addScanPaths([{
//     path: "/mnt/c/Users/murta/Documents/Obsidian/Keepsake",
//     ignored: [],
//     active: true,
// }]);