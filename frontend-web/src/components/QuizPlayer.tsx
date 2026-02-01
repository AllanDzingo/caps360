import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, ChevronRight, AlertCircle } from 'lucide-react';
import { progressApi } from '@/services/api';

// Types (Move to a shared types file later)
interface Question {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    difficulty: number;
    cognitiveLevel: string;
}

interface QuizState {
    currentQuestionIndex: number;
    score: number;
    streak: number;
    currentDifficulty: number;
    history: { questionId: string; correct: boolean; difficulty: number }[];
}

export const QuizPlayer: React.FC = () => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const navigate = useNavigate();
    // Get authenticated user
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { user, isAuthenticated } = require('../store/authStore').useAuthStore();

    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [gameState, setGameState] = useState<QuizState>({
        currentQuestionIndex: 0,
        score: 0,
        streak: 0,
        currentDifficulty: 2, // Start at 'Understand' level
        history: []
    });

    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);
    const [quizComplete, setQuizComplete] = useState(false);

    // Mock data for now - in real implementation this comes from API/AI
    // TODO: Replace with real AI generation endpoint
    const mockQuestions: Question[] = [
        {
            id: '1',
            question: 'What is the sum of 5 and 7?',
            options: ['10', '11', '12', '13'],
            correctAnswer: 2,
            explanation: '5 + 7 = 12',
            difficulty: 1,
            cognitiveLevel: 'Remember'
        },
        {
            id: '2',
            question: 'If you have 3 apples and buy 2 more, how many do you have?',
            options: ['4', '5', '6', '7'],
            correctAnswer: 1,
            explanation: '3 + 2 = 5',
            difficulty: 2,
            cognitiveLevel: 'Apply'
        },
        {
            id: '3',
            question: 'Which number is missing: 2, 4, __, 8, 10',
            options: ['5', '6', '7', '9'],
            correctAnswer: 1,
            explanation: 'The pattern is adding 2 to the previous number. 4 + 2 = 6.',
            difficulty: 3,
            cognitiveLevel: 'Analyze'
        }
    ];

    useEffect(() => {
        // Simulate fetching/generating questions
        setTimeout(() => {
            setQuestions(mockQuestions);
            setLoading(false);

            // Mark lesson as started
            if (lessonId && isAuthenticated && user?.id) {
                progressApi.startLesson(user.id, lessonId).catch(console.error);
            }
        }, 1000);
    }, [lessonId, isAuthenticated, user]);

    const handleAnswer = (optionIndex: number) => {
        if (isAnswered) return;

        setSelectedOption(optionIndex);
        setIsAnswered(true);
        setShowExplanation(true);

        const currentQuestion = questions[gameState.currentQuestionIndex];
        const isCorrect = optionIndex === currentQuestion.correctAnswer;

        // Adaptive Logic
        let newStreak = isCorrect ? gameState.streak + 1 : 0;
        let newDifficulty = gameState.currentDifficulty;

        if (newStreak >= 2 && newDifficulty < 5) {
            newDifficulty++; // Increase difficulty
            // In a real app, valid next questions would be filtered by this new difficulty
        } else if (!isCorrect && newDifficulty > 1) {
            newDifficulty--; // Decrease difficulty
        }

        setGameState(prev => ({
            ...prev,
            score: isCorrect ? prev.score + 1 : prev.score,
            streak: newStreak,
            currentDifficulty: newDifficulty,
            history: [...prev.history, {
                questionId: currentQuestion.id,
                correct: isCorrect,
                difficulty: currentQuestion.difficulty
            }]
        }));
    };

    const nextQuestion = () => {
        if (gameState.currentQuestionIndex >= questions.length - 1) {
            finishQuiz();
        } else {
            setGameState(prev => ({
                ...prev,
                currentQuestionIndex: prev.currentQuestionIndex + 1
            }));
            setSelectedOption(null);
            setIsAnswered(false);
            setShowExplanation(false);
        }
    };

    const finishQuiz = async () => {
        setQuizComplete(true);
        if (lessonId && isAuthenticated && user?.id) {
            // Calculate final score percentage
            const finalScore = Math.round((gameState.score / questions.length) * 100);
            await progressApi.completeLesson(user.id, lessonId, finalScore);
        }
    };

    if (!isAuthenticated || !user?.id) {
        navigate('/login');
        return null;
    }
    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Generating your adaptive quiz...</p>
                </div>
            </div>
        );
    }

    if (quizComplete) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="mb-6 inline-flex p-4 rounded-full bg-green-100 text-green-600">
                        <CheckCircle className="h-12 w-12" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Quiz Complete!</h1>
                    <p className="text-gray-600 mb-6">
                        You scored <span className="font-bold text-blue-600">{Math.round((gameState.score / questions.length) * 100)}%</span>
                    </p>

                    <div className="space-y-3">
                        <div className="flex justify-between text-sm text-gray-500 border-b pb-2">
                            <span>Questions</span>
                            <span>{questions.length}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-500 border-b pb-2">
                            <span>Correct</span>
                            <span>{gameState.score}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-500 border-b pb-2">
                            <span>Difficulty Reached</span>
                            <span>Level {gameState.currentDifficulty}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate(-1)} // Go back to lesson list
                        className="w-full mt-8 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-blue-200"
                    >
                        Return to Lessons
                    </button>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[gameState.currentQuestionIndex];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
            {/* Header / Progress */}
            <div className="w-full max-w-2xl mb-6 flex justify-between items-center text-sm text-gray-500 font-medium">
                <span>Question {gameState.currentQuestionIndex + 1} of {questions.length}</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">DIFFICULTY: {gameState.currentDifficulty}</span>
            </div>

            {/* Question Card */}
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-8 leading-relaxed">
                        {currentQuestion.question}
                    </h2>

                    <div className="space-y-3">
                        {currentQuestion.options.map((option, idx) => {
                            const isSelected = selectedOption === idx;
                            const isCorrect = idx === currentQuestion.correctAnswer;
                            const showCorrect = isAnswered && isCorrect;
                            const showIncorrect = isAnswered && isSelected && !isCorrect;

                            let buttonClass = "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex justify-between items-center group ";

                            if (isAnswered) {
                                if (showCorrect) buttonClass += "border-green-500 bg-green-50 text-green-700 font-medium";
                                else if (showIncorrect) buttonClass += "border-red-500 bg-red-50 text-red-700 font-medium";
                                else buttonClass += "border-gray-100 text-gray-400 opacity-60"; // fade out others
                            } else {
                                buttonClass += "border-gray-100 hover:border-blue-200 hover:bg-blue-50 text-gray-700";
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(idx)}
                                    disabled={isAnswered}
                                    className={buttonClass}
                                >
                                    <span className="flex items-center gap-3">
                                        <span className={`
                                            h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors
                                            ${isAnswered && (isCorrect || isSelected) ? 'bg-white bg-opacity-30' : 'bg-gray-100 group-hover:bg-white'}
                                        `}>
                                            {String.fromCharCode(65 + idx)}
                                        </span>
                                        {option}
                                    </span>

                                    {showCorrect && <CheckCircle className="h-5 w-5 text-green-600" />}
                                    {showIncorrect && <XCircle className="h-5 w-5 text-red-600" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Explanation / Next Button Footer */}
                {showExplanation && (
                    <div className="bg-gray-50 p-6 border-t border-gray-100 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-start gap-3 mb-6 p-4 bg-blue-50 rounded-xl text-blue-900">
                            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold mb-1 text-sm text-blue-700">Explanation</p>
                                <p className="text-sm leading-relaxed opacity-90">{currentQuestion.explanation}</p>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={nextQuestion}
                                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-200 hover:shadow-blue-300"
                            >
                                {gameState.currentQuestionIndex >= questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
