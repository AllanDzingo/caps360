import { GoogleGenerativeAI } from '@google/generative-ai';
import NodeCache from 'node-cache';
import { v4 as uuidv4 } from 'uuid';
import { getFirestore, Collections } from '../config/firestore';
import config from '../config';
import logger from '../config/logger';
import { AIConversation, AIMessage } from '../models/analytics.model';
import { Quiz, QuizQuestion } from '../models/content.model';

export class AIService {
    private genAI: GoogleGenerativeAI;
    private model: any;
    private cache: NodeCache;
    private db = getFirestore();

    constructor() {
        this.genAI = new GoogleGenerativeAI(config.ai.geminiApiKey);
        this.model = this.genAI.getGenerativeModel({ model: config.ai.model });
        // Cache AI responses for 1 hour
        this.cache = new NodeCache({ stdTTL: 3600 });
    }

    /**
     * AI Tutor Chat - Context-aware Q&A
     */
    async chat(
        userId: string,
        message: string,
        conversationId?: string,
        lessonContext?: string
    ): Promise<{ response: string; conversationId: string }> {
        try {
            let conversation: AIConversation;

            if (conversationId) {
                // Load existing conversation
                const doc = await this.db.collection(Collections.AI_CONVERSATIONS).doc(conversationId).get();
                if (doc.exists) {
                    conversation = doc.data() as AIConversation;
                } else {
                    conversation = this.createNewConversation(userId);
                }
            } else {
                conversation = this.createNewConversation(userId);
            }

            // Build conversation history
            const history = conversation.messages.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.content }],
            }));

            // Add system context
            const systemPrompt = this.buildTutorSystemPrompt(lessonContext);

            // Generate response
            const chat = this.model.startChat({
                history: [
                    { role: 'user', parts: [{ text: systemPrompt }] },
                    { role: 'model', parts: [{ text: 'I understand. I will act as a helpful CAPS-aligned tutor.' }] },
                    ...history,
                ],
            });

            const result = await chat.sendMessage(message);
            const response = result.response.text();

            // Add messages to conversation
            const userMessage: AIMessage = {
                id: uuidv4(),
                role: 'user',
                content: message,
                timestamp: new Date(),
            };

            const assistantMessage: AIMessage = {
                id: uuidv4(),
                role: 'assistant',
                content: response,
                timestamp: new Date(),
            };

            conversation.messages.push(userMessage, assistantMessage);
            conversation.updatedAt = new Date();

            // Save conversation
            await this.db.collection(Collections.AI_CONVERSATIONS).doc(conversation.id).set(conversation);

            logger.info(`AI chat: user ${userId}, conversation ${conversation.id}`);

            return {
                response,
                conversationId: conversation.id,
            };
        } catch (error) {
            logger.error('AI chat error:', error);
            throw error;
        }
    }

    /**
     * Quiz Generator - Generate CAPS-aligned quizzes
     */
    async generateQuiz(
        userId: string,
        lessonContent: string,
        grade: number,
        subject: string,
        numQuestions: number = 10
    ): Promise<Quiz> {
        try {
            // Check cache
            const cacheKey = `quiz_${grade}_${subject}_${lessonContent.substring(0, 50)}`;
            const cached = this.cache.get<Quiz>(cacheKey);
            if (cached) {
                logger.info('Returning cached quiz');
                return cached;
            }

            const prompt = `
You are a South African CAPS curriculum expert. Generate a quiz with ${numQuestions} multiple-choice questions based on the following lesson content.

Grade: ${grade}
Subject: ${subject}

Lesson Content:
${lessonContent}

Requirements:
- Questions must be aligned with CAPS curriculum standards
- Each question should have 4 options
- Provide the correct answer index (0-3)
- Include a brief explanation for each answer
- Assign points to each question (1-5 based on difficulty)

Return the quiz in the following JSON format:
{
  "title": "Quiz title",
  "questions": [
    {
      "question": "Question text",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": 0,
      "explanation": "Why this is correct",
      "points": 2
    }
  ]
}
`;

            const result = await this.model.generateContent(prompt);
            const responseText = result.response.text();

            // Parse JSON response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Failed to parse quiz JSON from AI response');
            }

            const quizData = JSON.parse(jsonMatch[0]);

            // Create quiz object
            const quizId = uuidv4();
            const quiz: Quiz = {
                id: quizId,
                title: quizData.title,
                questions: quizData.questions.map((q: any) => ({
                    id: uuidv4(),
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation,
                    points: q.points,
                })),
                totalQuestions: quizData.questions.length,
                passingScore: 60,
                accessTier: 'study_help' as any,
                aiGenerated: true,
                generatedBy: userId,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            // Save to Firestore
            await this.db.collection(Collections.QUIZZES).doc(quizId).set(quiz);

            // Cache the quiz
            this.cache.set(cacheKey, quiz);

            logger.info(`Quiz generated: ${quizId} for user ${userId}`);

            return quiz;
        } catch (error) {
            logger.error('Quiz generation error:', error);
            throw error;
        }
    }

    /**
     * Marking Assistant - Grade assignments with feedback
     */
    async gradeAssignment(
        assignmentText: string,
        rubric: string,
        maxScore: number
    ): Promise<{ score: number; feedback: string }> {
        try {
            const prompt = `
You are an experienced South African teacher grading student assignments according to CAPS standards.

Assignment Submission:
${assignmentText}

Grading Rubric:
${rubric}

Maximum Score: ${maxScore}

Please:
1. Grade the assignment out of ${maxScore} points
2. Provide detailed, constructive feedback
3. Highlight strengths and areas for improvement
4. Be encouraging and supportive

Return your response in the following JSON format:
{
  "score": <number>,
  "feedback": "<detailed feedback>"
}
`;

            const result = await this.model.generateContent(prompt);
            const responseText = result.response.text();

            // Parse JSON response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Failed to parse grading JSON from AI response');
            }

            const grading = JSON.parse(jsonMatch[0]);

            logger.info(`Assignment graded: score ${grading.score}/${maxScore}`);

            return grading;
        } catch (error) {
            logger.error('Assignment grading error:', error);
            throw error;
        }
    }

    /**
     * Curriculum Planner - Create lesson plans for teachers
     */
    async generateLessonPlan(
        grade: number,
        subject: string,
        topic: string,
        duration: number // in minutes
    ): Promise<string> {
        try {
            const prompt = `
You are a South African curriculum planning expert specializing in CAPS-aligned lesson plans.

Create a detailed lesson plan with the following parameters:
- Grade: ${grade}
- Subject: ${subject}
- Topic: ${topic}
- Duration: ${duration} minutes

The lesson plan should include:
1. Learning objectives (aligned with CAPS)
2. Required materials
3. Introduction/Hook (5-10 minutes)
4. Main teaching activities with time allocations
5. Assessment strategies
6. Differentiation for diverse learners
7. Homework/Extension activities
8. Reflection questions

Format the lesson plan in a clear, structured manner.
`;

            const result = await this.model.generateContent(prompt);
            const lessonPlan = result.response.text();

            logger.info(`Lesson plan generated: Grade ${grade}, ${subject}, ${topic}`);

            return lessonPlan;
        } catch (error) {
            logger.error('Lesson plan generation error:', error);
            throw error;
        }
    }

    /**
     * Build system prompt for AI tutor
     */
    private buildTutorSystemPrompt(lessonContext?: string): string {
        let prompt = `
You are a helpful, patient, and knowledgeable AI tutor for South African students. 
You specialize in the CAPS (Curriculum and Assessment Policy Statement) curriculum.

Your role is to:
- Answer student questions clearly and accurately
- Provide step-by-step explanations
- Use examples relevant to South African context
- Encourage critical thinking
- Be supportive and motivating
- Use age-appropriate language

Guidelines:
- Never give direct answers to homework/test questions
- Guide students to discover answers themselves
- Use the Socratic method when appropriate
- Celebrate student progress
`;

        if (lessonContext) {
            prompt += `\n\nCurrent Lesson Context:\n${lessonContext}`;
        }

        return prompt;
    }

    /**
     * Create new conversation
     */
    private createNewConversation(userId: string): AIConversation {
        return {
            id: uuidv4(),
            userId,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
}

export default new AIService();
