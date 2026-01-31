import { query } from '../config/database';
import { Course, Topic, Lesson } from '../models/content.model';
import logger from '../config/logger';

export class ContentService {

    /**
     * Get all subjects (courses) for a specific grade
     */
    async getSubjectsByGrade(grade: number): Promise<Course[]> {
        try {
            const sql = `
                SELECT * FROM courses 
                WHERE grade = $1 
                ORDER BY title ASC
            `;
            const { rows } = await query(sql, [grade]);

            return rows.map(this.mapDbCourseToModel);
        } catch (error) {
            logger.error(`Error fetching subjects for grade ${grade}`, error);
            throw error;
        }
    }

    /**
     * Get a specific subject by ID
     */
    async getSubjectById(id: string): Promise<Course | null> {
        try {
            const { rows } = await query('SELECT * FROM courses WHERE id = $1', [id]);
            if (rows.length === 0) return null;
            return this.mapDbCourseToModel(rows[0]);
        } catch (error) {
            logger.error(`Error fetching subject ${id}`, error);
            throw error;
        }
    }

    /**
     * Get topics for a specific subject (course)
     */
    async getTopicsBySubject(courseId: string): Promise<Topic[]> {
        try {
            const sql = `
                SELECT * FROM topics 
                WHERE course_id = $1 
                ORDER BY "order" ASC
            `;
            const { rows } = await query(sql, [courseId]);
            return rows.map(this.mapDbTopicToModel);
        } catch (error) {
            logger.error(`Error fetching topics for course ${courseId}`, error);
            throw error;
        }
    }

    /**
     * Get lessons for a specific topic
     */
    async getLessonsByTopic(topicId: string): Promise<Lesson[]> {
        try {
            const sql = `
                SELECT * FROM lessons 
                WHERE topic_id = $1 
                ORDER BY "order" ASC
            `;
            const { rows } = await query(sql, [topicId]);
            return rows.map(this.mapDbLessonToModel);
        } catch (error) {
            logger.error(`Error fetching lessons for topic ${topicId}`, error);
            throw error;
        }
    }

    /**
     * Get full structure: Subject -> Topics -> Lessons
     */
    async getSubjectStructure(courseId: string) {
        const subject = await this.getSubjectById(courseId);
        if (!subject) throw new Error('Subject not found');

        const topics = await this.getTopicsBySubject(courseId);

        const topicsWithLessons = await Promise.all(topics.map(async (topic) => {
            const lessons = await this.getLessonsByTopic(topic.id);
            return { ...topic, lessons };
        }));

        return {
            ...subject,
            topics: topicsWithLessons
        };
    }

    // --- Mappers ---

    private mapDbCourseToModel(row: any): Course {
        return {
            id: row.id,
            title: row.title,
            description: row.description,
            grade: row.grade,
            subject: row.subject,
            curriculum: row.curriculum,
            phase: row.phase,
            active: row.active,
            thumbnailUrl: row.thumbnail_url,
            accessTier: row.access_tier,
            lessonIds: [], // Populated separately if needed
            totalLessons: 0, // Calculated separately
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    private mapDbTopicToModel(row: any): Topic {
        return {
            id: row.id,
            courseId: row.course_id,
            title: row.title,
            description: row.description,
            grade: row.grade,
            order: row.order,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    private mapDbLessonToModel(row: any): Lesson {
        return {
            id: row.id,
            courseId: row.course_id,
            topicId: row.topic_id,
            title: row.title,
            description: row.description || '',
            content: row.content,
            order: row.order,
            videoUrl: row.video_url,
            pdfUrls: row.pdf_urls || [],
            accessTier: row.access_tier,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}

export default new ContentService();
