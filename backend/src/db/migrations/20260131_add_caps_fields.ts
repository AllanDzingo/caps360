import { pool } from '../../config/database';
import logger from '../../config/logger';

async function migrate() {
    logger.info('Starting CAPS fields migration...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Add curriculum, phase, active to courses
        logger.info('Updating courses table...');
        await client.query(`
            ALTER TABLE public.courses 
            ADD COLUMN IF NOT EXISTS curriculum text DEFAULT 'CAPS',
            ADD COLUMN IF NOT EXISTS phase text,
            ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
        `);

        // Add unique constraint to courses
        // First, check if it exists to avoid errors
        const courseConstraintCheck = await client.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'courses' AND constraint_name = 'courses_title_grade_curriculum_key';
        `);

        if (courseConstraintCheck.rows.length === 0) {
            logger.info('Adding unique constraint to courses...');
            await client.query(`
                ALTER TABLE public.courses 
                ADD CONSTRAINT courses_title_grade_curriculum_key UNIQUE (title, grade, curriculum);
            `);
        }

        // Add grade to topics
        logger.info('Updating topics table...');
        await client.query(`
            ALTER TABLE public.topics 
            ADD COLUMN IF NOT EXISTS grade integer;
        `);

        // Add unique constraint to topics
        const topicConstraintCheck = await client.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'topics' AND constraint_name = 'topics_course_id_title_key';
        `);

        if (topicConstraintCheck.rows.length === 0) {
            logger.info('Adding unique constraint to topics...');
            await client.query(`
                ALTER TABLE public.topics 
                ADD CONSTRAINT topics_course_id_title_key UNIQUE (course_id, title);
            `);
        }

        await client.query('COMMIT');
        logger.info('✅ Migration completed successfully!');
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
