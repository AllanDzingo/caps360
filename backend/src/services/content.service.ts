import { v4 as uuidv4 } from 'uuid';
import { supabase, Tables } from '../config/supabase';
import { uploadFile, generateSignedUrl } from '../config/storage';
import logger from '../config/logger';
import { Course, Lesson } from '../models/content.model';
import { SubscriptionTier } from '../models/user.model';

export class ContentService {
    /**
     * Get all courses
     */
    async getCourses(grade?: number, subject?: string): Promise<Course[]> {
        try {
            let query = supabase.from(Tables.COURSES).select('*');

            if (grade) {
                query = query.eq('grade', grade);
            }

            if (subject) {
                query = query.eq('subject', subject);
            }

            const { data, error } = await query;

            if (error) throw new Error(`Supabase error: ${error.message}`);

            return data as Course[];
        } catch (error) {
            logger.error('Get courses error:', error);
            throw error;
        }
    }

    /**
     * Get course by ID
     */
    async getCourseById(courseId: string): Promise<Course | null> {
        try {
            const { data, error } = await supabase
                .from(Tables.COURSES)
                .select('*')
                .eq('id', courseId)
                .single();

            if (error || !data) {
                return null;
            }
            return data as Course;
        } catch (error) {
            logger.error('Get course error:', error);
            throw error;
        }
    }

    /**
     * Get lessons for a course
     */
    async getLessonsByCourse(courseId: string): Promise<Lesson[]> {
        try {
            const { data, error } = await supabase
                .from(Tables.LESSONS)
                .select('*')
                .eq('courseId', courseId)
                .order('order', { ascending: true });

            if (error) throw new Error(`Supabase error: ${error.message}`);

            return data as Lesson[];
        } catch (error) {
            logger.error('Get lessons error:', error);
            throw error;
        }
    }

    /**
     * Get lesson by ID with signed URLs for media
     */
    async getLessonById(lessonId: string): Promise<Lesson | null> {
        try {
            const { data, error } = await supabase
                .from(Tables.LESSONS)
                .select('*')
                .eq('id', lessonId)
                .single();

            if (error || !data) {
                return null;
            }

            const lesson = data as Lesson;

            // Generate signed URLs
            try {
                if (lesson.videoUrl && !lesson.videoUrl.startsWith('http')) {
                    // Assumes videoUrl is just the path, e.g. "videos/..."
                    lesson.videoUrl = await generateSignedUrl('videos', lesson.videoUrl, 120);
                }

                if (lesson.pdfUrls && lesson.pdfUrls.length > 0) {
                    const pdfsToSign = lesson.pdfUrls.map(async (url) => {
                        if (url.startsWith('http')) return url;
                        // Assumes url is path in 'pdfs' bucket
                        return await generateSignedUrl('pdfs', url, 120);
                    });
                    lesson.pdfUrls = await Promise.all(pdfsToSign);
                }
            } catch (err) {
                logger.warn('Failed to sign URLs', err);
            }

            return lesson;
        } catch (error) {
            logger.error('Get lesson error:', error);
            throw error;
        }
    }

    /**
     * Upload video to Storage
     */
    async uploadVideo(
        file: Buffer,
        fileName: string,
        contentType: string
    ): Promise<string> {
        try {
            const path = `videos/${uuidv4()}-${fileName}`;
            await uploadFile('videos', path, file, contentType);
            logger.info(`Video uploaded: ${path}`);
            return path;
        } catch (error) {
            logger.error('Upload video error:', error);
            throw error;
        }
    }

    /**
     * Upload PDF to Storage
     */
    async uploadPDF(
        file: Buffer,
        fileName: string
    ): Promise<string> {
        try {
            const path = `pdfs/${uuidv4()}-${fileName}`;
            await uploadFile('pdfs', path, file, 'application/pdf');
            logger.info(`PDF uploaded: ${path}`);
            return path;
        } catch (error) {
            logger.error('Upload PDF error:', error);
            throw error;
        }
    }

    /**
     * Check if user has access to content based on tier
     */
    hasAccessToContent(userTier: SubscriptionTier, contentTier: SubscriptionTier): boolean {
        const tierHierarchy = {
            [SubscriptionTier.STUDY_HELP]: 1,
            [SubscriptionTier.STANDARD]: 2,
            [SubscriptionTier.PREMIUM]: 3,
        };

        return tierHierarchy[userTier] >= tierHierarchy[contentTier];
    }
}

export default new ContentService();
