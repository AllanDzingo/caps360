import contentService from './src/services/content.service';
import { pool } from './src/config/database';

async function verify() {
    const client = await pool.connect();
    try {
        console.log('--- FINAL SPOT CHECK ---');

        // 1. Check Grade 10 English Home Language (New)
        const ehlRes = await client.query("SELECT id FROM courses WHERE title = 'English Home Language' AND grade = 10");
        if (ehlRes.rows.length > 0) {
            const ehlId = ehlRes.rows[0].id;
            const structure = await contentService.getTopicsWithLessonsBySubject(ehlId);
            console.log(`Grade 10 English HL: ${structure.length} topics found.`);
            structure.forEach(t => {
                console.log(`  Topic: ${t.title} (${t.lessons?.length || 0} lessons)`);
            });
        } else {
            console.log('Grade 10 English HL NOT FOUND!');
        }

        // 2. Check Grade 7 Life Orientation (New)
        const loRes = await client.query("SELECT id FROM courses WHERE title = 'Life Orientation' AND grade = 7");
        if (loRes.rows.length > 0) {
            const loId = loRes.rows[0].id;
            const structure = await contentService.getTopicsWithLessonsBySubject(loId);
            console.log(`\nGrade 7 Life Orientation: ${structure.length} topics found.`);
        } else {
            console.log('\nGrade 7 Life Orientation NOT FOUND!');
        }

        // 3. Check Grade 12 Mathematics (Existing)
        const mathRes = await client.query("SELECT id FROM courses WHERE title = 'Mathematics' AND grade = 12");
        if (mathRes.rows.length > 0) {
            const mathId = mathRes.rows[0].id;
            const structure = await contentService.getTopicsWithLessonsBySubject(mathId);
            console.log(`\nGrade 12 Mathematics: ${structure.length} topics found.`);
        }

    } catch (err: any) {
        console.error('Verification error:', err.message);
    } finally {
        client.release();
        await pool.end();
        process.exit(0);
    }
}

verify();
