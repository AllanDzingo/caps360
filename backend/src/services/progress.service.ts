import { query } from '../config/database';
import logger from '../config/logger';

export class ProgressService {

    /**
     * Start a lesson (mark as started)
     * Idempotent: if already started, does nothing.
     */
    async startLesson(userId: string, lessonId: string): Promise<void> {
        try {
            await query(`
                INSERT INTO user_lesson_progress (user_id, lesson_id, status, started_at)
                VALUES ($1, $2, 'started', NOW())
                ON CONFLICT (user_id, lesson_id) DO NOTHING
            `, [userId, lessonId]);
        } catch (error) {
            logger.error(`Error starting lesson ${lessonId} for user ${userId}`, error);
            throw error;
        }
    }

    /**
     * Complete a lesson
     */
    async completeLesson(userId: string, lessonId: string, quizScore?: number): Promise<void> {
        try {
            await query(`
                INSERT INTO user_lesson_progress (user_id, lesson_id, status, quiz_score, completed_at, updated_at)
                VALUES ($1, $2, 'completed', $3, NOW(), NOW())
                ON CONFLICT (user_id, lesson_id) 
                DO UPDATE SET 
                    status = 'completed',
                    quiz_score = COALESCE($3, user_lesson_progress.quiz_score),
                    completed_at = NOW(),
                    updated_at = NOW()
            `, [userId, lessonId, quizScore]);

            // TODO: Trigger Topic/Subject progress recalculation
            await this.recalculateProgress(userId, lessonId);

        } catch (error) {
            logger.error(`Error completing lesson ${lessonId} for user ${userId}`, error);
            throw error;
        }
    }

    /**
     * Get aggregated progress for Dashboard
     */
    async getDashboardProgress(userId: string): Promise<any> {
        // Get executed lesson count vs total (simplistic)
        // Or get subject progress levels
        try {
            const { rows } = await query(`
                SELECT course_id, percent_complete 
                FROM user_subject_progress 
                WHERE user_id = $1
            `, [userId]);

            if (!rows || rows.length === 0) {
                // No progress yet, return empty object
                return {};
            }

            const progressMap = rows.reduce((acc: any, row: any) => {
                acc[row.course_id] = row.percent_complete;
                return acc;
            }, {});

            return progressMap;
        } catch (error) {
            logger.error(`Error fetching dashboard progress for user ${userId}`, error);
            // Instead of throwing, return empty object for no data
            return {};
        }
    }

    /**
     * Internal: Recalculate Topic and Subject progress
     */
    private async recalculateProgress(userId: string, lessonId: string) {
        // 1. Get Topic for Lesson
        const lessonRes = await query('SELECT topic_id, course_id FROM lessons WHERE id = $1', [lessonId]);
        if (lessonRes.rows.length === 0) return;

        const { topic_id, course_id } = lessonRes.rows[0];

        // 2. Recalculate Topic Progress
        // Topic Progress = (Completed Lessons / Total Lessons in Topic) * 100
        const topicStats = await query(`
            SELECT 
                COUNT(l.id) as total,
                COUNT(ulp.completed_at) as completed
            FROM lessons l
            LEFT JOIN user_lesson_progress ulp ON l.id = ulp.lesson_id AND ulp.user_id = $1
            WHERE l.topic_id = $2
        `, [userId, topic_id]);

        const totalTopicLessons = parseInt(topicStats.rows[0].total) || 1;
        const completedTopicLessons = parseInt(topicStats.rows[0].completed) || 0;
        const topicPercent = Math.round((completedTopicLessons / totalTopicLessons) * 100);

        await query(`
            INSERT INTO user_topic_progress (user_id, topic_id, percent_complete)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, topic_id) 
            DO UPDATE SET percent_complete = $3, updated_at = NOW()
        `, [userId, topic_id, topicPercent]);

        // 3. Recalculate Subject Progress (Average of Topics)
        // Subject Progress = AVG(Topic Progress)
        const subjectStats = await query(`
            SELECT AVG(COALESCE(utp.percent_complete, 0)) as avg_progress
            FROM topics t
            LEFT JOIN user_topic_progress utp ON t.id = utp.topic_id AND utp.user_id = $1
            WHERE t.course_id = $2
        `, [userId, course_id]);

        const subjectPercent = Math.round(parseFloat(subjectStats.rows[0].avg_progress) || 0);

        await query(`
            INSERT INTO user_subject_progress (user_id, course_id, percent_complete)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, course_id)
            DO UPDATE SET percent_complete = $3, updated_at = NOW()
        `, [userId, course_id, subjectPercent]);
    }
}

export default new ProgressService();
