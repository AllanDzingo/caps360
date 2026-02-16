import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } from "@azure/storage-blob";
import * as sql from "mssql";
import * as jwt from "jsonwebtoken";

// Configuration
const STORAGE_CONN_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const SQL_CONN_STRING = process.env.SQL_CONNECTION_STRING;
const JWT_SECRET = process.env.JWT_SECRET;
const CONTAINER_NAME = "caps360-lessons";

interface DecodedToken {
    userId: number;
    email: string;
    // Add other relevant fields
}

export async function getLessonAccess(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const lessonId = request.params.lessonId;
    if (!lessonId) {
        return { status: 400, body: "Missing lessonId" };
    }

    // 1. Validate JWT
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return { status: 401, body: "Missing or invalid Authorization header" };
    }

    const token = authHeader.split(" ")[1];
    let user: DecodedToken;

    try {
        if (!JWT_SECRET) throw new Error("JWT_SECRET not configured");
        user = jwt.verify(token, JWT_SECRET) as DecodedToken;
    } catch (err) {
        return { status: 401, body: "Invalid token" };
    }

    if (!STORAGE_CONN_STRING || !SQL_CONN_STRING) {
        return { status: 500, body: "Server configuration error" };
    }

    // Initialize SQL
    let pool: sql.ConnectionPool | null = null;

    try {
        pool = await sql.connect(SQL_CONN_STRING);

        // 2. Fetch Lesson Metadata
        const lessonResult = await pool.request()
            .input("LessonId", sql.Int, lessonId)
            .query("SELECT blob_path, access_level FROM Lessons WHERE id = @LessonId");

        if (lessonResult.recordset.length === 0) {
            return { status: 404, body: "Lesson not found" };
        }

        const { blob_path, access_level } = lessonResult.recordset[0];

        // 3. Check Subscription (if paid)
        if (access_level === 'paid') {
            const userResult = await pool.request()
                .input("UserId", sql.Int, user.userId)
                .query("SELECT subscription_status FROM Users WHERE id = @UserId");

            if (userResult.recordset.length === 0) {
                return { status: 403, body: "User not found" };
            }

            const subscriptionStatus = userResult.recordset[0].subscription_status;
            if (subscriptionStatus !== 'active' && subscriptionStatus !== 'paid') {
                return { status: 403, body: "Subscription required for this lesson" };
            }
        }

        // 4. Generate SAS Token
        // Extract account name and key from connection string for SAS generation
        // Connection string format: DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net
        const accountNameMatch = STORAGE_CONN_STRING.match(/AccountName=([^;]+)/);
        const accountKeyMatch = STORAGE_CONN_STRING.match(/AccountKey=([^;]+)/);

        if (!accountNameMatch || !accountKeyMatch) {
            throw new Error("Invalid storage connection string format");
        }

        const accountName = accountNameMatch[1];
        const accountKey = accountKeyMatch[1];
        const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

        const sasOptions = {
            containerName: CONTAINER_NAME,
            blobName: blob_path,
            permissions: BlobSASPermissions.parse("r"), // Read only
            startsOn: new Date(),
            expiresOn: new Date(new Date().valueOf() + 10 * 60 * 1000) // 10 minutes
        };

        const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
        const signedUrl = `https://${accountName}.blob.core.windows.net/${CONTAINER_NAME}/${blob_path}?${sasToken}`;

        return {
            status: 200,
            jsonBody: { signedUrl }
        };

    } catch (err) {
        context.log("Error in getLessonAccess:", err);
        return { status: 500, body: "Internal Server Error" };
    } finally {
        if (pool) await pool.close();
    }
}

app.http('getLessonAccess', {
    methods: ['GET'],
    authLevel: 'anonymous', // We handle auth via JWT
    route: 'lessons/{lessonId}/access',
    handler: getLessonAccess
});
