import { v4 as uuidv4 } from 'uuid';
import { pool } from './src/config/database';
import fs from 'fs';
import path from 'path';
import contentService from './src/services/content.service';

const CAPS_DATA = {
    "curriculum": "CAPS",
    "phases": [
        {
            "phase": "Foundation Phase",
            "grades": [1, 2, 3],
            "subjects": [
                {
                    "subject": "English Home Language",
                    "topics": [
                        {
                            "topic": "Listening and Speaking",
                            "lessons": [
                                { "lesson": "Greetings and polite language" },
                                { "lesson": "Following instructions" },
                                { "lesson": "Story listening and retelling" },
                                { "lesson": "Show and tell" },
                                { "lesson": "Oral presentations" }
                            ]
                        },
                        {
                            "topic": "Phonics and Word Recognition",
                            "lessons": [
                                { "lesson": "Letter sounds" },
                                { "lesson": "Blending sounds" },
                                { "lesson": "Sight words" },
                                { "lesson": "Word families" },
                                { "lesson": "Spelling patterns" }
                            ]
                        },
                        {
                            "topic": "Reading and Viewing",
                            "lessons": [
                                { "lesson": "Reading simple sentences" },
                                { "lesson": "Reading short stories" },
                                { "lesson": "Picture interpretation" },
                                { "lesson": "Predicting stories" },
                                { "lesson": "Basic comprehension" }
                            ]
                        },
                        {
                            "topic": "Writing and Handwriting",
                            "lessons": [
                                { "lesson": "Letter formation" },
                                { "lesson": "Writing words" },
                                { "lesson": "Writing sentences" },
                                { "lesson": "Creative writing" },
                                { "lesson": "Editing basics" }
                            ]
                        }
                    ]
                },
                {
                    "subject": "Afrikaans First Additional Language",
                    "topics": [
                        {
                            "topic": "Listening and Speaking",
                            "lessons": [
                                { "lesson": "Basic greetings" },
                                { "lesson": "Simple conversations" }
                            ]
                        },
                        {
                            "topic": "Reading",
                            "lessons": [
                                { "lesson": "Simple words" },
                                { "lesson": "Short sentences" }
                            ]
                        }
                    ]
                },
                {
                    "subject": "Mathematics",
                    "topics": [
                        {
                            "topic": "Numbers and Operations",
                            "lessons": [
                                { "lesson": "Counting" },
                                { "lesson": "Addition" },
                                { "lesson": "Subtraction" }
                            ]
                        },
                        {
                            "topic": "Patterns",
                            "lessons": [
                                { "lesson": "Repeating patterns" },
                                { "lesson": "Growing patterns" }
                            ]
                        },
                        {
                            "topic": "Space and Shape",
                            "lessons": [
                                { "lesson": "2D shapes" },
                                { "lesson": "3D objects" }
                            ]
                        }
                    ]
                },
                {
                    "subject": "Life Skills",
                    "topics": [
                        {
                            "topic": "Personal Well-being",
                            "lessons": [
                                { "lesson": "Healthy habits" },
                                { "lesson": "Emotions" }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            "phase": "Intermediate Phase",
            "grades": [4, 5, 6],
            "subjects": [
                {
                    "subject": "English Home Language",
                    "topics": [
                        {
                            "topic": "Reading and Viewing",
                            "lessons": [
                                { "lesson": "Fiction texts" },
                                { "lesson": "Non-fiction texts" },
                                { "lesson": "Visual literacy" }
                            ]
                        },
                        {
                            "topic": "Language Structures",
                            "lessons": [
                                { "lesson": "Parts of speech" },
                                { "lesson": "Tenses" }
                            ]
                        }
                    ]
                },
                {
                    "subject": "Mathematics",
                    "topics": [
                        {
                            "topic": "Whole Numbers",
                            "lessons": [
                                { "lesson": "Place value" },
                                { "lesson": "Operations" }
                            ]
                        },
                        {
                            "topic": "Fractions",
                            "lessons": [
                                { "lesson": "Equivalent fractions" },
                                { "lesson": "Operations with fractions" }
                            ]
                        }
                    ]
                },
                { "subject": "Afrikaans First Additional Language" },
                { "subject": "Natural Sciences & Technology" },
                { "subject": "Social Sciences" },
                { "subject": "Life Skills" }
            ]
        },
        {
            "phase": "Senior Phase",
            "grades": [7, 8, 9],
            "subjects": [
                {
                    "subject": "Mathematics",
                    "topics": [
                        {
                            "topic": "Algebra",
                            "lessons": [
                                { "lesson": "Algebraic expressions" },
                                { "lesson": "Equations" }
                            ]
                        }
                    ]
                },
                {
                    "subject": "Natural Sciences",
                    "topics": [
                        {
                            "topic": "Energy and Change",
                            "lessons": [
                                { "lesson": "Forms of energy" },
                                { "lesson": "Energy transfer" }
                            ]
                        }
                    ]
                },
                { "subject": "English Home Language" },
                { "subject": "Afrikaans First Additional Language" },
                { "subject": "Mathematics Literacy" },
                { "subject": "Social Sciences" },
                { "subject": "Technology" },
                { "subject": "Economic & Management Sciences" },
                { "subject": "Life Orientation" }
            ]
        },
        {
            "phase": "FET Phase",
            "grades": [10, 11, 12],
            "subjects": [
                {
                    "subject": "Physical Sciences",
                    "topics": [
                        {
                            "topic": "Mechanics",
                            "lessons": [
                                { "lesson": "Motion in one dimension" },
                                { "lesson": "Newton’s laws" }
                            ]
                        }
                    ]
                },
                {
                    "subject": "Life Sciences",
                    "topics": [
                        {
                            "topic": "Genetics",
                            "lessons": [
                                { "lesson": "DNA and RNA" },
                                { "lesson": "Inheritance" }
                            ]
                        }
                    ]
                },
                { "subject": "English Home Language" },
                { "subject": "Afrikaans First Additional Language" },
                { "subject": "Mathematics" },
                { "subject": "Mathematical Literacy" },
                { "subject": "Computer Applications Technology" },
                { "subject": "Information Technology" },
                { "subject": "Engineering Graphics & Design" },
                { "subject": "Accounting" },
                { "subject": "Business Studies" },
                { "subject": "Economics" },
                { "subject": "Geography" },
                { "subject": "History" },
                { "subject": "Tourism" },
                { "subject": "Life Orientation" }
            ]
        }
    ]
};

async function populate() {
    const logFile = 'populate-result.log';
    const output: string[] = [];
    const log = (msg: string) => {
        console.log(msg);
        output.push(msg);
    };

    log('--- STARTING CURRICULUM POPULATION ---');

    // Set explicit timeouts for the client
    let client;
    try {
        client = await pool.connect();
        log('Connected to database.');
    } catch (err: any) {
        log(`Failed to connect to database: ${err.message}`);
        process.exit(1);
    }

    let subjectsTotal = 0;
    let subjectsInserted = 0;
    let topicsInserted = 0;
    let lessonsInserted = 0;

    try {
        // Set statement_timeout to 60 seconds
        await client.query('SET statement_timeout = 60000');

        for (const phase of CAPS_DATA.phases) {
            log(`\nProcessing Phase: ${phase.phase}`);
            for (const grade of phase.grades) {
                log(`  Grade ${grade}:`);
                await client.query('BEGIN'); // Start transaction for each grade

                for (const subjInfo of phase.subjects) {
                    subjectsTotal++;
                    const subjectTitle = subjInfo.subject;

                    // 1. Ensure Subject exists
                    const subjectRes = await client.query(
                        'SELECT id FROM public.courses WHERE title = $1 AND grade = $2',
                        [subjectTitle, grade]
                    );

                    let courseId: string;
                    if (subjectRes.rows.length === 0) {
                        courseId = uuidv4();
                        await client.query(
                            'INSERT INTO public.courses (id, title, grade, subject, phase, curriculum, active, access_tier) VALUES ($1, $2, $3, $2, $4, $5, true, $6)',
                            [courseId, subjectTitle, grade, phase.phase, CAPS_DATA.curriculum, 'study_help']
                        );
                        subjectsInserted++;
                        log(`    + Inserted Subject: ${subjectTitle}`);
                    } else {
                        courseId = subjectRes.rows[0].id;
                    }

                    // 2. Ensure Topics exist
                    if (subjInfo.topics) {
                        for (let i = 0; i < subjInfo.topics.length; i++) {
                            const topicInfo = subjInfo.topics[i];
                            const topicOrder = i + 1;

                            const topicRes = await client.query(
                                'SELECT id FROM public.topics WHERE course_id = $1 AND title = $2',
                                [courseId, topicInfo.topic]
                            );

                            let topicId: string;
                            if (topicRes.rows.length === 0) {
                                topicId = uuidv4();
                                await client.query(
                                    'INSERT INTO public.topics (id, course_id, title, grade, "order") VALUES ($1, $2, $3, $4, $5)',
                                    [topicId, courseId, topicInfo.topic, grade, topicOrder]
                                );
                                topicsInserted++;
                                log(`      + Inserted Topic: ${topicInfo.topic}`);
                            } else {
                                topicId = topicRes.rows[0].id;
                                // Update grade if set to null or incorrect
                                await client.query(
                                    'UPDATE public.topics SET grade = $1 WHERE id = $2 AND (grade IS NULL OR grade != $1)',
                                    [grade, topicId]
                                );
                            }

                            // 3. Ensure Lessons exist
                            if (topicInfo.lessons) {
                                for (let j = 0; j < topicInfo.lessons.length; j++) {
                                    const lessonInfo = topicInfo.lessons[j];
                                    const lessonOrder = j + 1;

                                    const lessonRes = await client.query(
                                        'SELECT id FROM public.lessons WHERE topic_id = $1 AND title = $2',
                                        [topicId, lessonInfo.lesson]
                                    );

                                    if (lessonRes.rows.length === 0) {
                                        const lessonId = uuidv4();
                                        await client.query(
                                            'INSERT INTO public.lessons (id, course_id, topic_id, title, "order", content, access_tier) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                                            [
                                                lessonId,
                                                courseId,
                                                topicId,
                                                lessonInfo.lesson,
                                                lessonOrder,
                                                `## ${lessonInfo.lesson}\n\nThis is a placeholder for the academic content of this lesson. Actual content will be added shortly.`,
                                                'study_help'
                                            ]
                                        );
                                        lessonsInserted++;
                                    }
                                }
                            }
                        }
                    }
                }
                await client.query('COMMIT'); // Commit after each grade
            }
        }

        await client.query('COMMIT');
        log('\n--- POPULATION SUMMARY ---');
        log(`Total subjects processed: ${subjectsTotal}`);
        log(`New subjects inserted: ${subjectsInserted}`);
        log(`New topics inserted: ${topicsInserted}`);
        log(`New lessons inserted: ${lessonsInserted}`);

        // 4. Final Verification of API logic for ALL subjects
        log('\n--- VERIFYING CONTENT API ---');
        const allCourses = await client.query('SELECT id, title, grade FROM public.courses ORDER BY grade, title');
        let totalFailures = 0;

        for (const course of allCourses.rows) {
            try {
                const structure = await contentService.getTopicsWithLessonsBySubject(course.id);
                // We expect topics if we know them from data, but some might still be empty if not in seed
                if (structure.length === 0) {
                    // Check if DB actually has topics for this course
                    const dbTopics = await client.query('SELECT id FROM public.topics WHERE course_id = $1', [course.id]);
                    if (dbTopics.rows.length > 0) {
                        log(`  ERROR: API failed for [${course.title}] (Grade ${course.grade}). DB has topics but API returned empty.`);
                        totalFailures++;
                    }
                }
            } catch (err: any) {
                log(`  ERROR: API crashed for [${course.title}] (Grade ${course.grade}): ${err.message}`);
                totalFailures++;
            }
        }

        if (totalFailures === 0) {
            log('✅ All subject endpoints verified successfully.');
        } else {
            log(`❌ Verification failed for ${totalFailures} subjects.`);
        }

    } catch (error: any) {
        await client.query('ROLLBACK');
        log(`\n❌ POPULATION FAILED: ${error.message}`);
        log(error.stack);
    } finally {
        fs.writeFileSync(logFile, output.join('\n'));
        client.release();
        await pool.end();
        process.exit(0);
    }
}

populate();
