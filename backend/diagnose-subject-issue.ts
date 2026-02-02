import { pool } from './src/config/database';

async function diagnoseSubjectIssue() {
    const client = await pool.connect();
    try {
        console.log('=== DIAGNOSTIC: Subject Not Found Issue ===\n');

        // 1. Check all Grade 10 subjects (most common test case)
        console.log('Grade 10 Subjects:');
        const grade10 = await client.query('SELECT id, title FROM public.courses WHERE grade = 10 ORDER BY title');
        grade10.rows.forEach(row => {
            console.log(`  ${row.title}: ${row.id}`);
        });

        // 2. Check if there are any subjects with NULL or invalid IDs
        console.log('\n\nSubjects with potential ID issues:');
        const badIds = await client.query("SELECT id, title, grade FROM public.courses WHERE id IS NULL OR id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'");
        if (badIds.rows.length > 0) {
            console.log('  FOUND BAD IDs:');
            badIds.rows.forEach(row => {
                console.log(`    Grade ${row.grade} - ${row.title}: ${row.id}`);
            });
        } else {
            console.log('  None found (all IDs are valid UUIDs)');
        }

        // 3. Check if dashboard API would return these subjects
        console.log('\n\nChecking what Dashboard API returns for Grade 10:');
        const dashboardQuery = await client.query(`
            SELECT id, title, description, grade, subject, thumbnail_url, access_tier 
            FROM public.courses 
            WHERE grade = 10 AND active = true 
            ORDER BY title
        `);
        console.log(`  Found ${dashboardQuery.rows.length} active subjects for Grade 10`);

        // 4. Test if we can fetch a specific subject's topics
        if (grade10.rows.length > 0) {
            const testSubject = grade10.rows[0];
            console.log(`\n\nTesting topic fetch for: ${testSubject.title} (${testSubject.id})`);

            const topicsRes = await client.query('SELECT id, title FROM public.topics WHERE course_id = $1', [testSubject.id]);
            console.log(`  Found ${topicsRes.rows.length} topics`);
            if (topicsRes.rows.length > 0) {
                topicsRes.rows.slice(0, 3).forEach(t => console.log(`    - ${t.title}`));
            }
        }

    } catch (error: any) {
        console.error('Diagnostic error:', error.message);
    } finally {
        client.release();
        await pool.end();
        process.exit(0);
    }
}

diagnoseSubjectIssue();
