import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { scansTable } from './db/schema';
import { Queue } from 'bullmq';

const db = drizzle(process.env.DATABASE_URL!);
const scanQueue = new Queue("scan-operations");


interface AddScanPathsProps {
    path: string;
    ignored: string[];
    active: boolean;
}
// Write scaned file to database
export async function addScanPaths(props: AddScanPathsProps[]) {
    const scans: typeof scansTable.$inferInsert[] = props.map((prop) => ({
        path: prop.path,
        active: prop.active,
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

// addScanPaths([{
//     path: "C:\\Users\\murta\\Documents\\Book",
//     ignored: [],
//     active: true,
// }]);