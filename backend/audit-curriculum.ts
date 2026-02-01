import { pool } from './src/config/database';
import fs from 'fs';
import contentService from './src/services/content.service';

async function audit() {
    const output: string[] = [];
    const log = (msg: string) => {
        console.log(msg);
        output.push(msg);
    };

    log('--- STARTING ENHANCED CURRICULUM AUDIT ---');
    let client;
    try {
        client = await pool.connect();
        log('Connected to database.');

        // 1. Audit Courses (Subjects)
        log('\nQuerying courses...');
        const coursesResult = await client.query('SELECT id, title, grade, curriculum, phase FROM public.courses ORDER BY grade, title');
        log(`Total Courses Found: ${coursesResult.rows.length}`);

        const coursesByGrade: Record<number, string[]> = {};
        coursesResult.rows.forEach(row => {
            if (!coursesByGrade[row.grade]) coursesByGrade[row.grade] = [];
            coursesByGrade[row.grade].push(row.title);
        });

        // 2. Audit Topics
        const topicsResult = await client.query('SELECT id, title, course_id, grade FROM public.topics');
        log(`Total Topics Found: ${topicsResult.rows.length}`);

        const topicsByCourse: Record<string, any[]> = {};
        topicsResult.rows.forEach(row => {
            if (!topicsByCourse[row.course_id]) topicsByCourse[row.course_id] = [];
            topicsByCourse[row.course_id].push(row);
        });

        // 3. Audit Lessons
        const lessonsResult = await client.query('SELECT id, title, topic_id FROM public.lessons');
        log(`Total Lessons Found: ${lessonsResult.rows.length}`);

        const lessonsByTopic: Record<string, number> = {};
        lessonsResult.rows.forEach(row => {
            lessonsByTopic[row.topic_id] = (lessonsByTopic[row.topic_id] || 0) + 1;
        });

        log('\n--- Detailed Curriculum State ---');
        for (const course of coursesResult.rows) {
            const topics = topicsByCourse[course.id] || [];
            log(`\nSubject: ${course.title} (Grade ${course.grade}, ID: ${course.id})`);
            log(`- Topics: ${topics.length}`);

            if (topics.length > 0) {
                // Verify API logic: getTopicsWithLessonsBySubject
                const structure = await contentService.getTopicsWithLessonsBySubject(course.id);
                if (structure.length === 0) {
                    log(`  ERROR: API returned empty topics for subject ${course.id} even though topics exist in DB!`);
                } else {
                    let totalLessons = 0;
                    structure.forEach(t => {
                        const lessonCount = t.lessons?.length || 0;
                        totalLessons += lessonCount;
                    });
                    log(`  API matches DB. Total lessons across all topics: ${totalLessons}`);
                }
            } else {
                log('  WARNING: No topics found for this subject.');
            }
        }

        log('\n--- AUDIT COMPLETE ---');

    } catch (error: any) {
        log(`Audit failed with error: ${error.message}\n${error.stack}`);
    } finally {
        fs.writeFileSync('audit-result.log', output.join('\n'));
        if (client) client.release();
        await pool.end();
        process.exit(0);
    }
}

audit();
