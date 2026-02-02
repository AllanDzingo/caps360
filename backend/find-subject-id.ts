import { pool } from './src/config/database';

// Usage: npx tsx find-subject-id.ts "Mathematics" 10
// Or just: npx tsx find-subject-id.ts to see all subjects

async function findSubjectId() {
    const subjectName = process.argv[2];
    const grade = process.argv[3] ? parseInt(process.argv[3]) : null;

    const client = await pool.connect();
    try {
        if (!subjectName) {
            // Show all subjects grouped by grade
            console.log('All Subjects in Database:\n');
            const res = await client.query('SELECT id, title, grade FROM public.courses ORDER BY grade, title');

            let currentGrade = -1;
            res.rows.forEach(row => {
                if (row.grade !== currentGrade) {
                    currentGrade = row.grade;
                    console.log(`\n=== Grade ${row.grade} ===`);
                }
                console.log(`${row.title}: ${row.id}`);
            });
        } else if (grade) {
            // Find specific subject by name and grade
            const res = await client.query(
                'SELECT id, title, grade FROM public.courses WHERE title = $1 AND grade = $2',
                [subjectName, grade]
            );

            if (res.rows.length > 0) {
                console.log(`\nFound: ${res.rows[0].title} (Grade ${res.rows[0].grade})`);
                console.log(`Subject ID: ${res.rows[0].id}`);
            } else {
                console.log(`\nNo subject found matching "${subjectName}" for Grade ${grade}`);

                // Show similar subjects
                const similarRes = await client.query(
                    'SELECT id, title, grade FROM public.courses WHERE title ILIKE $1 ORDER BY grade',
                    [`%${subjectName}%`]
                );

                if (similarRes.rows.length > 0) {
                    console.log('\nDid you mean one of these?');
                    similarRes.rows.forEach(row => {
                        console.log(`  ${row.title} (Grade ${row.grade}): ${row.id}`);
                    });
                }
            }
        } else {
            // Find all subjects with matching name across all grades
            const res = await client.query(
                'SELECT id, title, grade FROM public.courses WHERE title ILIKE $1 ORDER BY grade',
                [`%${subjectName}%`]
            );

            if (res.rows.length > 0) {
                console.log(`\nFound ${res.rows.length} matching subjects:\n`);
                res.rows.forEach(row => {
                    console.log(`Grade ${row.grade} - ${row.title}: ${row.id}`);
                });
            } else {
                console.log(`\nNo subjects found matching "${subjectName}"`);
            }
        }
    } catch (err: any) {
        console.error('Error:', err.message);
    } finally {
        client.release();
        await pool.end();
        process.exit(0);
    }
}

findSubjectId();
