import { AzureOpenAI } from 'openai';
import NodeCache from 'node-cache';
import { v4 as uuidv4 } from 'uuid';

import { query } from '../config/database';
import config from '../config';
import logger from '../config/logger';
import { AIConversation, AIMessage } from '../models/analytics.model';
import { Quiz } from '../models/content.model';

export class AIService {
    private client: AzureOpenAI;
    private deployment: string;
    private cache: NodeCache;

    constructor() {
        this.client = new AzureOpenAI({
            apiKey: config.ai.azure.apiKey,
            endpoint: config.ai.azure.endpoint,
            apiVersion: config.ai.azure.apiVersion,
            deployment: config.ai.azure.deployment
        });
        this.deployment = config.ai.azure.deployment;
        this.cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache
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
                const { rows } = await query('SELECT * FROM ai_conversations WHERE id = $1', [conversationId]);
                const data = rows[0];

                if (data) {
                    conversation = this.mapDbConversationToModel(data);
                } else {
                    conversation = this.createNewConversation(userId);
                }
            } else {
                conversation = this.createNewConversation(userId);
            }

            const history = conversation.messages.map(msg => ({
                role: msg.role as 'system' | 'user' | 'assistant',
                content: msg.content,
            }));

            const systemPrompt = this.buildTutorSystemPrompt(lessonContext);

            const messages: any[] = [
                { role: 'system', content: systemPrompt },
                ...history,
                { role: 'user', content: message }
            ];

            const result = await this.client.chat.completions.create({
                model: this.deployment,
                messages: messages,
                max_tokens: 800,
                temperature: 0.7,
            });

            const response = result.choices[0].message.content || "I'm sorry, I couldn't generate a response.";

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

            const sql = `
                INSERT INTO ai_conversations (
                    id, user_id, messages, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (id) DO UPDATE SET
                    messages = EXCLUDED.messages,
                    updated_at = EXCLUDED.updated_at
            `;

            const values = [
                conversation.id,
                conversation.userId,
                JSON.stringify(conversation.messages),
                conversation.createdAt.toISOString(),
                conversation.updatedAt.toISOString()
            ];

            await query(sql, values);

            logger.info(`AI chat success: user=${userId}, conversation=${conversation.id}`);

            return {
                response,
                conversationId: conversation.id,
            };
        } catch (error) {
            logger.error('AI chat error', error);
            throw error;
        }
    }

    private mapDbConversationToModel(dbConv: any): AIConversation {
        return {
            id: dbConv.id,
            userId: dbConv.user_id,
            messages: dbConv.messages || [],
            createdAt: new Date(dbConv.created_at),
            updatedAt: new Date(dbConv.updated_at),
        };
    }

    /**
     * Quiz Generator - CAPS-aligned quizzes
     */
    async generateQuiz(
        userId: string,
        lessonContent: string,
        grade: number,
        subject: string,
        numQuestions: number = 10
    ): Promise<Quiz> {
        try {
            const cacheKey = `quiz_${grade}_${subject}_${lessonContent.substring(0, 50)}`;
            const cached = this.cache.get<Quiz>(cacheKey);
            if (cached) {
                logger.info('Returning cached quiz');
                return cached;
            }

            const prompt = `
You are a South African CAPS curriculum expert. Generate a quiz with ${numQuestions} multiple-choice questions.

Grade: ${grade}
Subject: ${subject}

Lesson Content:
${lessonContent}

Return valid JSON strictly matching this structure:
{
  "title": "Quiz Title",
  "questions": [
    {
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0, // index of correct option
      "explanation": "Why it is correct",
      "points": 1
    }
  ]
}
`;

            const result = await this.client.chat.completions.create({
                model: this.deployment,
                messages: [{ role: 'system', content: prompt }],
                response_format: { type: "json_object" },
                temperature: 0.3,
            });

            const responseText = result.choices[0].message.content || '{}';
            const quizData = JSON.parse(responseText);

            const quiz: Quiz = {
                id: uuidv4(),
                title: quizData.title || `Grade ${grade} ${subject} Quiz`,
                questions: quizData.questions.map((q: any) => ({
                    id: uuidv4(),
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation,
                    points: q.points,
                })),
                totalQuestions: quizData.questions?.length || 0,
                passingScore: 60,
                accessTier: 'study_help' as any,

                // Adaptive defaults
                adaptive: false,
                difficultyStart: 2,
                difficultyMax: 5,

                aiGenerated: true,
                generatedBy: userId,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const sql = `
                INSERT INTO quizzes (
                    id, title, questions, total_questions, passing_score,
                    access_tier, ai_generated, generated_by, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `;

            const values = [
                quiz.id,
                quiz.title,
                JSON.stringify(quiz.questions),
                quiz.totalQuestions,
                quiz.passingScore,
                quiz.accessTier,
                quiz.aiGenerated,
                quiz.generatedBy,
                quiz.createdAt.toISOString(),
                quiz.updatedAt.toISOString()
            ];

            await query(sql, values);

            this.cache.set(cacheKey, quiz);
            logger.info(`Quiz generated: ${quiz.id}`);

            return quiz;
        } catch (error) {
            logger.error('Quiz generation error', error);
            throw error;
        }
    }

    /**
     * Assignment Marking
     */
    async gradeAssignment(
        assignmentText: string,
        rubric: string,
        maxScore: number
    ): Promise<{ score: number; feedback: string }> {
        try {
            const prompt = `
Grade this assignment using CAPS standards.

Assignment:
${assignmentText}

Rubric:
${rubric}

Max Score: ${maxScore}

Return JSON only: { "score": number, "feedback": "string" }
`;

            const result = await this.client.chat.completions.create({
                model: this.deployment,
                messages: [{ role: 'system', content: prompt }],
                response_format: { type: "json_object" },
                temperature: 0.3,
            });

            const responseText = result.choices[0].message.content || '{}';
            return JSON.parse(responseText);
        } catch (error) {
            logger.error('Assignment grading error', error);
            throw error;
        }
    }

    /**
     * Lesson Plan Generator
     */
    async generateLessonPlan(
        grade: number,
        subject: string,
        topic: string,
        duration: number
    ): Promise<string> {
        try {
            const prompt = `
Create a CAPS-aligned lesson plan.

Grade: ${grade}
Subject: ${subject}
Topic: ${topic}
Duration: ${duration} minutes
`;

            const result = await this.client.chat.completions.create({
                model: this.deployment,
                messages: [{ role: 'system', content: prompt }],
                temperature: 0.7,
            });

            return result.choices[0].message.content || 'Failed to generate lesson plan.';
        } catch (error) {
            logger.error('Lesson plan generation error', error);
            throw error;
        }
    }

    private buildTutorSystemPrompt(lessonContext?: string): string {
        let prompt = `
You are a CAPS-aligned South African AI tutor.
Be supportive, clear, and age-appropriate.
`;

        if (lessonContext) {
            prompt += `\nLesson Context:\n${lessonContext}`;
        }

        return prompt;
    }

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
