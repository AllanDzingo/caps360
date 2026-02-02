import { pool } from './src/config/database';

// These are the IDs that are failing from the F12 console
const failingIds = [
    '62704353-83ad-42e4-8283-f9604cac4d7f',
    '9e7e2b6a-0e2f-42b6-9e0f-ae2fba75e76c'
];

async function checkMissingSubjects() {
    const client = await pool.connect();
    try {
        console.log('=== CHECKING FAILING SUBJECT IDS ===\n');

        for (const id of failingIds) {
            console.log(`Checking ID: ${id}`);

            // Check if it exists in courses table
            const courseRes = await client.query('SELECT id, title, grade, active FROM public.courses WHERE id = $1', [id]);

            if (courseRes.rows.length > 0) {
                const course = courseRes.rows[0];
                console.log(`  ✓ FOUND: ${course.title} (Grade ${course.grade}, Active: ${course.active})`);

                // Check topics
                const topicsRes = await client.query('SELECT id, title FROM public.topics WHERE course_id = $1', [id]);
                console.log(`  Topics: ${topicsRes.rows.length} found`);
            } else {
                console.log(`  ✗ NOT FOUND in database`);
            }
            console.log('');
        }

        // Now show what DOES exist in the database for comparison
        console.log('\n=== WHAT ACTUALLY EXISTS (Sample) ===');
        console.log('First 10 subjects in database:\n');
        const existingRes = await client.query('SELECT id, title, grade FROM public.courses ORDER BY grade, title LIMIT 10');
        existingRes.rows.forEach(row => {
            console.log(`  ${row.title} (Grade ${row.grade}): ${row.id}`);
        });

    } catch (error: any) {
        console.error('Error:', error.message);
    } finally {
        client.release();
        await pool.end();
        process.exit(0);
    }
}

checkMissingSubjects();
