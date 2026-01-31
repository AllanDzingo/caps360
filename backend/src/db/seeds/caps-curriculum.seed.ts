import { pool } from '../../config/database';
import logger from '../../config/logger';

interface SeedSubject {
    name: string;
    grade: number;
    phase: 'Foundation' | 'Intermediate' | 'Senior' | 'FET';
    topics: string[];
}

const curriculumData: SeedSubject[] = [
    // Foundation Phase (Grades 1–3)
    ...[1, 2, 3].flatMap(grade => ([
        { name: 'Mathematics', grade, phase: 'Foundation', topics: ['Numbers & Operations', 'Patterns', 'Measurement', 'Space & Shape'] },
        { name: 'Home Language', grade, phase: 'Foundation', topics: ['Listening & Speaking', 'Reading & Viewing', 'Writing'] },
        { name: 'First Additional Language', grade, phase: 'Foundation', topics: ['Vocabulary', 'Reading', 'Writing'] },
        { name: 'Life Skills', grade, phase: 'Foundation', topics: ['Personal & Social Well-being', 'Physical Education', 'Creative Arts'] },
    ] as SeedSubject[])),

    // Intermediate Phase (Grades 4–6)
    ...[4, 5, 6].flatMap(grade => ([
        { name: 'Mathematics', grade, phase: 'Intermediate', topics: ['Whole Numbers', 'Fractions & Decimals', 'Geometry', 'Measurement', 'Data Handling'] },
        { name: 'English Home Language', grade, phase: 'Intermediate', topics: ['Grammar & Language Structures', 'Reading & Comprehension', 'Writing & Essays'] },
        { name: 'Natural Sciences & Technology', grade, phase: 'Intermediate', topics: ['Life & Living', 'Matter & Materials', 'Energy & Change', 'Systems & Control'] },
        { name: 'Social Sciences', grade, phase: 'Intermediate', topics: ['History (Local & World History)', 'Geography (Maps, Climate, Resources)'] },
    ] as SeedSubject[])),

    // Senior Phase (Grades 7–9)
    ...[7, 8, 9].flatMap(grade => ([
        { name: 'Mathematics', grade, phase: 'Senior', topics: ['Integers', 'Algebraic Expressions', 'Geometry', 'Probability', 'Financial Mathematics'] },
        { name: 'Natural Sciences', grade, phase: 'Senior', topics: ['Life & Living', 'Matter & Materials', 'Energy & Change', 'Earth & Beyond'] },
        { name: 'Social Sciences', grade, phase: 'Senior', topics: ['History', 'Geography'] },
        { name: 'Technology', grade, phase: 'Senior', topics: ['Structures', 'Mechanical Systems', 'Electrical Systems'] },
        { name: 'Economic & Management Sciences', grade, phase: 'Senior', topics: ['The Economy', 'Entrepreneurship', 'Financial Literacy'] },
    ] as SeedSubject[])),

    // FET Phase (Grades 10–12)
    ...[10, 11, 12].flatMap(grade => ([
        { name: 'Mathematics', grade, phase: 'FET', topics: ['Functions', 'Trigonometry', 'Analytical Geometry', 'Probability', 'Calculus (introductory)'] },
        { name: 'Mathematical Literacy', grade, phase: 'FET', topics: ['Finance', 'Measurement', 'Data Handling'] },
        { name: 'Physical Sciences', grade, phase: 'FET', topics: ['Physics (Mechanics, Waves, Electricity)', 'Chemistry (Matter, Reactions, Acids & Bases)'] },
        { name: 'Life Sciences', grade, phase: 'FET', topics: ['Cell Biology', 'Genetics', 'Evolution', 'Human Physiology'] },
        { name: 'Geography', grade, phase: 'FET', topics: ['Climate & Weather', 'Geomorphology', 'Development Geography'] },
        { name: 'History', grade, phase: 'FET', topics: ['World History', 'South African History'] },
        { name: 'Accounting', grade, phase: 'FET', topics: ['Financial Statements', 'Cost Accounting'] },
        { name: 'Business Studies', grade, phase: 'FET', topics: ['Entrepreneurship', 'Business Environments', 'Business Operations'] },
        { name: 'Economics', grade, phase: 'FET', topics: ['Microeconomics', 'Macroeconomics'] },
        { name: 'CAT', grade, phase: 'FET', topics: ['Hardware & Software', 'Spreadsheets', 'Databases'] },
    ] as SeedSubject[])),
];

async function seed() {
    const client = await pool.connect();
    let subjectsInserted = 0;
    let subjectsUpdated = 0;
    let topicsInserted = 0;
    let topicsUpdated = 0;

    try {
        await client.query('BEGIN');
        logger.info('Starting CAPS curriculum seeding...');

        for (const data of curriculumData) {
            // Upsert Subject (Course)
            const subjectResult = await client.query(`
        INSERT INTO public.courses (title, grade, subject, phase, curriculum, active)
        VALUES ($1, $2, $1, $3, 'CAPS', true)
        ON CONFLICT (title, grade, curriculum) 
        DO UPDATE SET phase = EXCLUDED.phase, updated_at = NOW()
        RETURNING id, (xmax = 0) AS is_inserted
      `, [data.name, data.grade, data.phase]);

            const courseId = subjectResult.rows[0].id;
            if (subjectResult.rows[0].is_inserted) {
                subjectsInserted++;
            } else {
                subjectsUpdated++;
            }

            // Upsert Topics
            for (let i = 0; i < data.topics.length; i++) {
                const topicName = data.topics[i];
                const topicOrder = i + 1;

                const topicResult = await client.query(`
          INSERT INTO public.topics (course_id, title, "order", grade)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (course_id, title)
          DO UPDATE SET "order" = EXCLUDED."order", grade = EXCLUDED.grade, updated_at = NOW()
          RETURNING id, (xmax = 0) AS is_inserted
        `, [courseId, topicName, topicOrder, data.grade]);

                if (topicResult.rows[0].is_inserted) {
                    topicsInserted++;
                } else {
                    topicsUpdated++;
                }
            }
        }

        await client.query('COMMIT');
        logger.info('Seeding completed successfully!');
        logger.info(`Subjects: ${subjectsInserted} inserted, ${subjectsUpdated} updated`);
        logger.info(`Topics: ${topicsInserted} inserted, ${topicsUpdated} updated`);

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Error during seeding:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
