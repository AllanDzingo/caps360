import { Storage } from '@google-cloud/storage';
import config from './index';

let storageInstance: Storage | null = null;

export const getStorage = (): Storage => {
    if (!storageInstance) {
        storageInstance = new Storage({
            projectId: config.gcp.projectId,
        });
    }
    return storageInstance;
};

export const getBucket = () => {
    const storage = getStorage();
    return storage.bucket(config.gcp.bucketName);
};

/**
 * Generate a signed URL for secure file access
 * @param fileName - Name of the file in the bucket
 * @param expiresInMinutes - URL expiration time in minutes (default: 60)
 */
export const generateSignedUrl = async (
    fileName: string,
    expiresInMinutes: number = 60
): Promise<string> => {
    const bucket = getBucket();
    const file = bucket.file(fileName);

    const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expiresInMinutes * 60 * 1000,
    });

    return url;
};

export default getStorage;
