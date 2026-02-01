import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { contentApi, progressApi, Subject, ProgressMap } from '@/services/api';
import { SubjectTile } from '../components/SubjectTile';
import { Loader2, MessageSquare, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuthStore();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [progress, setProgress] = useState<ProgressMap>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Check if user needs to select subjects
    const needsSubjects = !user?.subjects || user.subjects.length === 0;

    useEffect(() => {
        if (!isAuthenticated || !user?.id) {
            navigate('/login');
            return;
        }
        const fetchData = async () => {
            try {
                // Default to Grade 10 if user has no grade, or use user's grade
                const gradeToFetch = user?.grade || 10;
                // Fetch subjects and progress in parallel
                const [subjectsData, progressData] = await Promise.all([
                    contentApi.getDashboard(gradeToFetch),
                    progressApi.getDashboardProgress(user.id)
                ]);
                setSubjects(subjectsData);
                setProgress(progressData);
            } catch (err) {
                console.error('Failed to load dashboard:', err);
                setError('Failed to load your courses. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, isAuthenticated, navigate]);

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8 text-center text-red-600">
                <p>{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <header className="mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Welcome back, {user?.firstName || 'Learner'}! 👋
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Pick up where you left off. You are currently viewing <strong>Grade {user?.grade || 10}</strong> content.
                        </p>
                    </div>
                    <Button
                        variant="primary"
                        onClick={() => navigate('/ai-chat')}
                        className="flex items-center"
                    >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        AI Tutor
                    </Button>
                </div>
            </header>

            {/* Prompt to select subjects if none selected */}
            {needsSubjects && (
                <Card className="mb-8 p-6 bg-blue-50 border-blue-200">
                    <div className="flex items-start">
                        <BookOpen className="w-6 h-6 text-brand-blue mr-3 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Select Your Subjects
                            </h3>
                            <p className="text-gray-600 mb-4">
                                You haven't selected any subjects yet. Choose your subjects to see personalized content and track your progress.
                            </p>
                            <Button
                                variant="primary"
                                onClick={() => navigate('/select-subjects')}
                            >
                                Choose Subjects Now
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subjects.map((subject) => (
                    <SubjectTile
                        key={subject.id}
                        subject={subject}
                        progress={progress[subject.id] || 0}
                    />
                ))}
            </div>

            {subjects.length === 0 && !needsSubjects && (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No subjects found for this grade.</p>
                </div>
            )}
        </div>
    );
};
