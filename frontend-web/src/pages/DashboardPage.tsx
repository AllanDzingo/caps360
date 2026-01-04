import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { contentApi, progressApi, Subject, ProgressMap } from '../lib/api';
import { SubjectTile } from '../components/SubjectTile';
import { Loader2 } from 'lucide-react';

export const DashboardPage: React.FC = () => {
    const { user } = useAuthStore();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [progress, setProgress] = useState<ProgressMap>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Default to Grade 10 if user has no grade, or use user's grade
                const gradeToFetch = user?.grade || 10;

                // Fetch subjects and progress in parallel
                // User ID hardcoded to 'demo-user-id' for now as per plan
                const demoUserId = 'demo-user-id';

                const [subjectsData, progressData] = await Promise.all([
                    contentApi.getDashboard(gradeToFetch),
                    progressApi.getDashboardProgress(demoUserId)
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
    }, [user]);

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
                <h1 className="text-3xl font-bold text-gray-900">
                    Welcome back, {user?.firstName || 'Learner'}! 👋
                </h1>
                <p className="text-gray-600 mt-2">
                    Pick up where you left off. You are currently viewing <strong>Grade {user?.grade || 10}</strong> content.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subjects.map((subject) => (
                    <SubjectTile
                        key={subject.id}
                        subject={subject}
                        progress={progress[subject.id] || 0}
                    />
                ))}
            </div>

            {subjects.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No subjects found for this grade.</p>
                </div>
            )}
        </div>
    );
};
