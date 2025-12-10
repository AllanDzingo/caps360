import { v4 as uuidv4 } from 'uuid';
import { getFirestore, Collections } from '../config/firestore';
import { getBucket, generateSignedUrl } from '../config/storage';
import logger from '../config/logger';
import { Course, Lesson } from '../models/content.model';
import { SubscriptionTier } from '../models/user.model';

export class ContentService {
    private db = getFirestore();

    /**
     * Get all courses
     */
    async getCourses(grade?: number, subject?: string): Promise<Course[]> {
        try {
            let query = this.db.collection(Collections.COURSES);

            if (grade) {
                query = query.where('grade', '==', grade) as any;
            }

            if (subject) {
                query = query.where('subject', '==', subject) as any;
            }

            const snapshot = await query.get();
            return snapshot.docs.map(doc => doc.data() as Course);
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
            const doc = await this.db.collection(Collections.COURSES).doc(courseId).get();
            if (!doc.exists) {
                return null;
            }
            return doc.data() as Course;
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
            const snapshot = await this.db
                .collection(Collections.LESSONS)
                .where('courseId', '==', courseId)
                .orderBy('order', 'asc')
                .get();

            return snapshot.docs.map(doc => doc.data() as Lesson);
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
            const doc = await this.db.collection(Collections.LESSONS).doc(lessonId).get();
            if (!doc.exists) {
                return null;
            }

            const lesson = doc.data() as Lesson;

            // Generate signed URLs for video and PDFs
            if (lesson.videoUrl) {
                lesson.videoUrl = await generateSignedUrl(lesson.videoUrl, 120); // 2 hours
            }

            if (lesson.pdfUrls && lesson.pdfUrls.length > 0) {
                lesson.pdfUrls = await Promise.all(
                    lesson.pdfUrls.map(url => generateSignedUrl(url, 120))
                );
            }

            return lesson;
        } catch (error) {
            logger.error('Get lesson error:', error);
            throw error;
        }
    }

    /**
     * Upload video to Cloud Storage
     */
    async uploadVideo(
        file: Buffer,
        fileName: string,
        contentType: string
    ): Promise<string> {
        try {
            const bucket = getBucket();
            const blob = bucket.file(`videos/${uuidv4()}-${fileName}`);

            await blob.save(file, {
                contentType,
                metadata: {
                    cacheControl: 'public, max-age=31536000',
                },
            });

            logger.info(`Video uploaded: ${blob.name}`);

            return blob.name;
        } catch (error) {
            logger.error('Upload video error:', error);
            throw error;
        }
    }

    /**
     * Upload PDF to Cloud Storage
     */
    async uploadPDF(
        file: Buffer,
        fileName: string
    ): Promise<string> {
        try {
            const bucket = getBucket();
            const blob = bucket.file(`pdfs/${uuidv4()}-${fileName}`);

            await blob.save(file, {
                contentType: 'application/pdf',
                metadata: {
                    cacheControl: 'public, max-age=31536000',
                },
            });

            logger.info(`PDF uploaded: ${blob.name}`);

            return blob.name;
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
