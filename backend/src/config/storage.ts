import { supabase } from './supabase';
import logger from './logger';

/**
 * Upload file to Supabase Storage
 */
export const uploadFile = async (
    bucketName: string,
    path: string,
    file: Buffer,
    contentType: string
): Promise<string> => {
    try {
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(path, file, {
                contentType,
                cacheControl: '3600',
                upsert: true,
            });

        if (error) {
            throw error;
        }

        return data.path;
    } catch (error) {
        logger.error('Supabase upload error:', error);
        throw error;
    }
};

/**
 * Generate a signed URL for secure file access
 */
export const generateSignedUrl = async (
    bucketName: string,
    path: string,
    expiresInMinutes: number = 60
): Promise<string> => {
    try {
        const { data, error } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(path, expiresInMinutes * 60);

        if (error) {
            throw error;
        }

        return data.signedUrl;
    } catch (error) {
        logger.error('Supabase signed URL error:', error);
        // Fallback or rethrow
        return '';
    }
};

export default {
    uploadFile,
    generateSignedUrl,
};
