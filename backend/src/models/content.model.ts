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

export interface Lesson {
    id: string;
    courseId: string;
    title: string;
    description: string;
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
