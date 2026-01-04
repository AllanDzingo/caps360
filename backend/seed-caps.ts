import { v4 as uuidv4 } from 'uuid';
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

// Setup Client using DATABASE_URL
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is required.');
    process.exit(1);
}

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

// Helper wrapper to match previous query signature
async function query(text: string, params?: any[]) {
    return client.query(text, params);
}

const CAPS_DATA = {
    "curriculum": "CAPS",
    "phases": [
        {
            "phase": "Foundation Phase",
            "grades": [1, 2, 3],
            "subjects": [
                {
                    "subject": "English Home Language",
                    "code": "EHL",
                    "topics": [
                        {
                            "topic": "Listening and Speaking",
                            "lessons": [
                                { "lesson": "Greetings and polite language", "quiz": true },
                                { "lesson": "Following instructions", "quiz": true },
                                { "lesson": "Story listening and retelling", "quiz": true },
                                { "lesson": "Show and tell", "quiz": true },
                                { "lesson": "Oral presentations", "quiz": true }
                            ]
                        },
                        {
                            "topic": "Phonics and Word Recognition",
                            "lessons": [
                                { "lesson": "Letter sounds", "quiz": true },
                                { "lesson": "Blending sounds", "quiz": true },
                                { "lesson": "Sight words", "quiz": true },
                                { "lesson": "Word families", "quiz": true },
                                { "lesson": "Spelling patterns", "quiz": true }
                            ]
                        },
                        {
                            "topic": "Reading and Viewing",
                            "lessons": [
                                { "lesson": "Reading simple sentences", "quiz": true },
                                { "lesson": "Reading short stories", "quiz": true },
                                { "lesson": "Picture interpretation", "quiz": true },
                                { "lesson": "Predicting stories", "quiz": true },
                                { "lesson": "Basic comprehension", "quiz": true }
                            ]
                        },
                        {
                            "topic": "Writing and Handwriting",
                            "lessons": [
                                { "lesson": "Letter formation", "quiz": true },
                                { "lesson": "Writing words", "quiz": true },
                                { "lesson": "Writing sentences", "quiz": true },
                                { "lesson": "Creative writing", "quiz": true },
                                { "lesson": "Editing basics", "quiz": true }
                            ]
                        }
                    ]
                },
                {
                    "subject": "Afrikaans First Additional Language",
                    "code": "AFAL",
                    "topics": [
                        {
                            "topic": "Listening and Speaking",
                            "lessons": [
                                { "lesson": "Basic greetings", "quiz": true },
                                { "lesson": "Simple conversations", "quiz": true }
                            ]
                        },
                        {
                            "topic": "Reading",
                            "lessons": [
                                { "lesson": "Simple words", "quiz": true },
                                { "lesson": "Short sentences", "quiz": true }
                            ]
                        }
                    ]
                },
                {
                    "subject": "Mathematics",
                    "code": "MATH",
                    "topics": [
                        {
                            "topic": "Numbers and Operations",
                            "lessons": [
                                { "lesson": "Counting", "quiz": true },
                                { "lesson": "Addition", "quiz": true },
                                { "lesson": "Subtraction", "quiz": true }
                            ]
                        },
                        {
                            "topic": "Patterns",
                            "lessons": [
                                { "lesson": "Repeating patterns", "quiz": true },
                                { "lesson": "Growing patterns", "quiz": true }
                            ]
                        },
                        {
                            "topic": "Space and Shape",
                            "lessons": [
                                { "lesson": "2D shapes", "quiz": true },
                                { "lesson": "3D objects", "quiz": true }
                            ]
                        }
                    ]
                },
                {
                    "subject": "Life Skills",
                    "code": "LS",
                    "topics": [
                        {
                            "topic": "Personal Well-being",
                            "lessons": [
                                { "lesson": "Healthy habits", "quiz": true },
                                { "lesson": "Emotions", "quiz": true }
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
                                { "lesson": "Fiction texts", "quiz": true },
                                { "lesson": "Non-fiction texts", "quiz": true },
                                { "lesson": "Visual literacy", "quiz": true }
                            ]
                        },
                        {
                            "topic": "Language Structures",
                            "lessons": [
                                { "lesson": "Parts of speech", "quiz": true },
                                { "lesson": "Tenses", "quiz": true }
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
                                { "lesson": "Place value", "quiz": true },
                                { "lesson": "Operations", "quiz": true }
                            ]
                        },
                        {
                            "topic": "Fractions",
                            "lessons": [
                                { "lesson": "Equivalent fractions", "quiz": true },
                                { "lesson": "Operations with fractions", "quiz": true }
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
                                { "lesson": "Algebraic expressions", "quiz": true },
                                { "lesson": "Equations", "quiz": true }
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
                                { "lesson": "Forms of energy", "quiz": true },
                                { "lesson": "Energy transfer", "quiz": true }
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
                                { "lesson": "Motion in one dimension", "quiz": true },
                                { "lesson": "Newton’s laws", "quiz": true }
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
                                { "lesson": "DNA and RNA", "quiz": true },
                                { "lesson": "Inheritance", "quiz": true }
                            ]
                        }
                    ]
                },
                { "subject": "English Home Language" },
                { "subject": "Afrikaans First Additional Language" },
                { "subject": "Mathematics" },
                { "subject": "Mathematics Literacy" },
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

async function seedCurriculum() {
    console.log('🌱 Seeding CAPS Curriculum...');

    try {
        await client.connect();
        console.log('Connected to database.');

        for (const phase of CAPS_DATA.phases) {
            console.log(`Processing ${phase.phase}...`);

            for (const grade of phase.grades) {
                console.log(`  Grade ${grade}...`);

                for (const subjData of phase.subjects) {
                    const subjectName = subjData.subject;

                    // 1. Create/Get Subject (Course)
                    let courseId = '';
                    const courseRes = await query(
                        'SELECT id FROM courses WHERE grade = $1 AND title = $2',
                        [grade, subjectName]
                    );

                    if (courseRes.rows.length > 0) {
                        courseId = courseRes.rows[0].id;
                        // console.log(`    .${subjectName} exists`);
                    } else {
                        courseId = uuidv4();
                        await query(
                            `INSERT INTO courses (id, title, description, grade, subject, access_tier) 
                             VALUES ($1, $2, $3, $4, $5, 'study_help')`,
                            [courseId, subjectName, `Grade ${grade} ${subjectName}`, grade, subjectName]
                        );
                        console.log(`    + Created Subject: ${subjectName}`);
                    }

                    // 2. Create Topics & Lessons (if defined)
                    if (subjData.topics) {
                        let topicOrder = 1;
                        for (const topicData of subjData.topics) {
                            let topicId = '';

                            // Check existing topic
                            const topicRes = await query(
                                'SELECT id FROM topics WHERE course_id = $1 AND title = $2',
                                [courseId, topicData.topic]
                            );

                            if (topicRes.rows.length > 0) {
                                topicId = topicRes.rows[0].id;
                            } else {
                                topicId = uuidv4();
                                await query(
                                    `INSERT INTO topics (id, course_id, title, "order") VALUES ($1, $2, $3, $4)`,
                                    [topicId, courseId, topicData.topic, topicOrder++]
                                );
                                // console.log(`      + Top: ${topicData.topic}`);
                            }

                            // 3. Create Lessons
                            if (topicData.lessons) {
                                let lessonOrder = 1;
                                for (const lessonData of topicData.lessons) {
                                    // Check existing lesson
                                    const lessonRes = await query(
                                        'SELECT id FROM lessons WHERE topic_id = $1 AND title = $2',
                                        [topicId, lessonData.lesson]
                                    );

                                    if (lessonRes.rows.length === 0) {
                                        const lessonId = uuidv4();
                                        await query(
                                            `INSERT INTO lessons (id, course_id, topic_id, title, "order", content, access_tier) 
                                             VALUES ($1, $2, $3, $4, $5, $6, 'study_help')`,
                                            [
                                                lessonId,
                                                courseId,
                                                topicId,
                                                lessonData.lesson,
                                                lessonOrder++,
                                                `## ${lessonData.lesson}\n\nContent for this lesson will be available soon.`,
                                            ]
                                        );
                                        // console.log(`        + Les: ${lessonData.lesson}`);
                                    }
                                }
                            }
                        }
                    } else {
                        // Create generic placeholders if no topics defined (Optional)
                        // For now we leave it empty as per strict data-driven instruction
                    }
                }
            }
        }

        console.log('✅ Seeding complete!');
    } catch (err) {
        console.error('❌ Seeding failed:', err);
    } finally {
        await client.end();
    }
}

// Execute
seedCurriculum();
