import { GoogleGenerativeAI } from '@google/generative-ai';
import NodeCache from 'node-cache';
import { v4 as uuidv4 } from 'uuid';
import { supabase, Tables } from '../config/supabase';
import config from '../config';
import logger from '../config/logger';
import { AIConversation, AIMessage } from '../models/analytics.model';
import { Quiz } from '../models/content.model';

export class AIService {
    private genAI: GoogleGenerativeAI;
    private model: any;
    private cache: NodeCache;

    constructor() {
        this.genAI = new GoogleGenerativeAI(config.ai.geminiApiKey);
        this.model = this.genAI.getGenerativeModel({ model: config.ai.model });
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
                const { data, error: dbError } = await supabase
                    .from(Tables.AI_CONVERSATIONS)
                    .select('*')
                    .eq('id', conversationId)
                    .single();

                if (dbError) {
                    logger.warn(`Failed to load conversation ${conversationId}`, dbError);
                }

                if (data) {
                    conversation = this.mapDbConversationToModel(data);
                } else {
                    conversation = this.createNewConversation(userId);
                }
            } else {
                conversation = this.createNewConversation(userId);
            }

            const history = conversation.messages.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.content }],
            }));

            const systemPrompt = this.buildTutorSystemPrompt(lessonContext);

            const chat = this.model.startChat({
                history: [
                    { role: 'user', parts: [{ text: systemPrompt }] },
                    {
                        role: 'model',
                        parts: [{ text: 'I understand. I will act as a helpful CAPS-aligned tutor.' }],
                    },
                    ...history,
                ],
            });

            const result = await chat.sendMessage(message);
            const response = result.response.text();

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

            const dbConversation = {
                id: conversation.id,
                user_id: conversation.userId,
                messages: conversation.messages,
                created_at: conversation.createdAt.toISOString(),
                updated_at: conversation.updatedAt.toISOString(),
            };

            const { error: saveError } = await supabase
                .from(Tables.AI_CONVERSATIONS)
                .upsert(dbConversation);

            if (saveError) {
                throw new Error(`Supabase error: ${saveError.message}`);
            }

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

Return valid JSON only.
`;

            const result = await this.model.generateContent(prompt);
            const responseText = result.response.text();

            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Failed to parse quiz JSON');
            }

            const quizData = JSON.parse(jsonMatch[0]);

            const quiz: Quiz = {
                id: uuidv4(),
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

            const { error: insertError } = await supabase
                .from(Tables.QUIZZES)
                .insert({
                    id: quiz.id,
                    title: quiz.title,
                    questions: quiz.questions,
                    total_questions: quiz.totalQuestions,
                    passing_score: quiz.passingScore,
                    access_tier: quiz.accessTier,
                    ai_generated: quiz.aiGenerated,
                    generated_by: quiz.generatedBy,
                    created_at: quiz.createdAt.toISOString(),
                    updated_at: quiz.updatedAt.toISOString(),
                });

            if (insertError) {
                throw new Error(`Supabase error: ${insertError.message}`);
            }

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

Return JSON only.
`;

            const result = await this.model.generateContent(prompt);
            const responseText = result.response.text();

            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Failed to parse grading JSON');
            }

            return JSON.parse(jsonMatch[0]);
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

            const result = await this.model.generateContent(prompt);
            return result.response.text();
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
