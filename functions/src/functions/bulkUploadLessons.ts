import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import * as sql from "mssql";
import * as fs from "fs";
import * as path from "path";

// Interfaces
interface LessonMetadata {
    grade: number;
    subject: string;
    topic: string;
    title: string;
    blob_path: string;
    access_level: string; // 'free' or 'paid'
}

// Configuration
const STORAGE_CONN_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const SQL_CONN_STRING = process.env.SQL_CONNECTION_STRING;
const CONTAINER_NAME = "caps360-lessons";
const CONTENT_ROOT = path.resolve(__dirname, "../../../../content"); // Adjust based on deployment structure or local run

async function parseLessonFile(filePath: string, relativePath: string): Promise<LessonMetadata | null> {
    try {
        const content = fs.readFileSync(filePath, "utf-8");

        // Simple regex parsing for frontmatter
        const titleMatch = content.match(/^title:\s*(.+)$/m);
        const gradeMatch = content.match(/^grade:\s*(\d+)$/m);
        const subjectMatch = content.match(/^subject:\s*(.+)$/m);
        const topicMatch = content.match(/^topic:\s*(.+)$/m);

        if (!titleMatch || !gradeMatch || !subjectMatch || !topicMatch) {
            return null;
        }

        // Normalize Blob Path (force forward slashes)
        const blobPath = relativePath.replace(/\\/g, "/");

        return {
            title: titleMatch[1].trim(),
            grade: parseInt(gradeMatch[1].trim()),
            subject: subjectMatch[1].trim(),
            topic: topicMatch[1].trim(),
            blob_path: blobPath,
            access_level: "free" // Default to free for now
        };
    } catch (err) {
        console.error(`Error parsing file ${filePath}:`, err);
        return null;
    }
}

async function uploadToBlob(blobServiceClient: BlobServiceClient, filePath: string, blobPath: string) {
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    await containerClient.createIfNotExists();

    const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
    const content = fs.readFileSync(filePath, "utf-8");

    await blockBlobClient.upload(content, content.length, {
        blobHTTPHeaders: { blobContentType: "text/markdown" }
    });
}

async function ensureTableExists(pool: sql.ConnectionPool) {
    const createTableQuery = `
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Lessons' and xtype='U')
        CREATE TABLE Lessons (
            id INT IDENTITY(1,1) PRIMARY KEY,
            title NVARCHAR(255),
            grade INT,
            subject NVARCHAR(100),
            topic NVARCHAR(100),
            blob_path NVARCHAR(500) UNIQUE,
            access_level NVARCHAR(50) DEFAULT 'free'
        )
    `;
    await pool.request().query(createTableQuery);
}

async function updateDatabase(pool: sql.ConnectionPool, metadata: LessonMetadata) {
    // MERGE (Upsert) Logic
    const query = `
        MERGE INTO Lessons AS target
        USING (SELECT @Title AS title, @Grade AS grade, @Subject AS subject, @Topic AS topic, @BlobPath AS blob_path, @AccessLevel AS access_level) AS source
        ON (target.blob_path = source.blob_path)
        WHEN MATCHED THEN
            UPDATE SET 
                title = source.title,
                grade = source.grade,
                subject = source.subject,
                topic = source.topic,
                access_level = source.access_level
        WHEN NOT MATCHED THEN
            INSERT (title, grade, subject, topic, blob_path, access_level)
            VALUES (source.title, source.grade, source.subject, source.topic, source.blob_path, source.access_level);
    `;

    await pool.request()
        .input("Title", sql.NVarChar, metadata.title)
        .input("Grade", sql.Int, metadata.grade)
        .input("Subject", sql.NVarChar, metadata.subject)
        .input("Topic", sql.NVarChar, metadata.topic)
        .input("BlobPath", sql.NVarChar, metadata.blob_path)
        .input("AccessLevel", sql.NVarChar, metadata.access_level)
        .query(query);
}

export async function bulkUploadLessons(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Starting bulk upload from: ${CONTENT_ROOT}`);

    if (!STORAGE_CONN_STRING || !SQL_CONN_STRING) {
        return { status: 500, body: "Missing connection strings configuration." };
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(STORAGE_CONN_STRING);
    let pool: sql.ConnectionPool | null = null;

    try {
        pool = await sql.connect(SQL_CONN_STRING);

        await ensureTableExists(pool); // Ensure Schema exists

        const filesToProcess: string[] = [];

        function scanDir(dir: string) {
            if (!fs.existsSync(dir)) return;
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    scanDir(fullPath);
                } else if (file.endsWith(".md")) {
                    filesToProcess.push(fullPath);
                }
            }
        }

        scanDir(CONTENT_ROOT);
        context.log(`Found ${filesToProcess.length} markdown files.`);

        let processedCount = 0;
        let errorCount = 0;

        for (const filePath of filesToProcess) {
            try {
                const relativePath = path.relative(CONTENT_ROOT, filePath);
                const metadata = await parseLessonFile(filePath, relativePath);
                if (!metadata) {
                    context.log(`Skipping ${relativePath}: Invalid metadata.`);
                    continue;
                }

                await uploadToBlob(blobServiceClient, filePath, metadata.blob_path);
                await updateDatabase(pool, metadata);

                processedCount++;
            } catch (err) {
                errorCount++;
                context.log(`Error processing ${filePath}:`, err);
            }
        }

        return {
            status: 200,
            jsonBody: {
                message: "Bulk upload complete",
                processed: processedCount,
                errors: errorCount
            }
        };

    } catch (err) {
        context.log("Critical Error:", err);
        return { status: 500, body: `Server Error: ${err.message}` };
    } finally {
        if (pool) await pool.close();
    }
}

app.http('bulkUploadLessons', {
    methods: ['POST', 'GET'],
    authLevel: 'function',
    handler: bulkUploadLessons
});
