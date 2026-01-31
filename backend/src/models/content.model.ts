export enum ContentType {
    VIDEO = 'video',
    PDF = 'pdf',
    QUIZ = 'quiz',
    ASSIGNMENT = 'assignment',
}

export interface Course {
    id: string;
    title: string;
    description: string;
    grade: number;
    subject: string;
    curriculum?: string;
    phase?: string;
    active?: boolean;
    thumbnailUrl?: string;

    // Access control
    accessTier: SubscriptionTier;

    // Metadata
    lessonIds: string[];
    totalLessons: number;
    totalDuration?: number; // in minutes

    createdAt: Date;
    updatedAt: Date;
}

export interface Topic {
    id: string;
    courseId: string;
    title: string;
    description?: string;
    grade?: number;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Lesson {
    id: string;
    courseId: string;
    topicId: string; // Added hierarchy
    title: string;
    description: string;
    content?: string; // Markdown/HTML
    order: number;

    // Content
    videoUrl?: string;
    videoDuration?: number; // in seconds
    pdfUrls?: string[];

    // Access control
    accessTier: SubscriptionTier;

    // Related content
    quizIds?: string[];
    assignmentIds?: string[];

    createdAt: Date;
    updatedAt: Date;
}

export interface Quiz {
    id: string;
    lessonId?: string;
    title: string;
    description?: string;

    // Questions
    questions: QuizQuestion[];
    totalQuestions: number;
    passingScore: number; // percentage

    // Adaptive Settings
    adaptive: boolean;
    difficultyStart: number;
    difficultyMax: number;
    timeLimitMinutes?: number;
    adaptiveRules?: {
        increaseAfter: number; // e.g. 2 consecutive correct
        decreaseAfter: number; // e.g. 2 consecutive incorrect
    };

    // Access control
    accessTier: SubscriptionTier;

    // AI-generated flag
    aiGenerated: boolean;
    generatedBy?: string; // userId

    createdAt: Date;
    updatedAt: Date;
}

export interface QuizQuestion {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number; // index of correct option
    explanation?: string;
    points: number;

    // Adaptive Metadata
    difficulty: number; // 1-6
    cognitiveLevel: 'Remember' | 'Understand' | 'Apply' | 'Analyse' | 'Evaluate' | 'Create';
    type: 'multiple_choice' | 'true_false' | 'short_answer';
}

export interface Assignment {
    id: string;
    lessonId?: string;
    teacherId: string;
    title: string;
    description: string;
    instructions: string;

    // Submission
    dueDate?: Date;
    maxScore: number;

    // Access control
    accessTier: SubscriptionTier;

    createdAt: Date;
    updatedAt: Date;
}

export interface Submission {
    id: string;
    assignmentId: string;
    studentId: string;

    // Content
    fileUrls: string[];
    textContent?: string;

    // Grading
    score?: number;
    feedback?: string;
    aiGraded: boolean;
    gradedBy?: string; // teacherId or 'ai'
    gradedAt?: Date;

    submittedAt: Date;
    updatedAt: Date;
}

import { SubscriptionTier } from './user.model';
