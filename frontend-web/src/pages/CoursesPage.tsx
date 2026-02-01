import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { contentApi, progressApi, Subject, ProgressMap, default as api } from '@/services/api';
import { SubjectTile } from '../components/SubjectTile';
import { Loader2, BookOpen, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export const CoursesPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated, updateUser } = useAuthStore();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [progress, setProgress] = useState<ProgressMap>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        const fetchData = async () => {
            try {
                // Fetch latest user profile to ensure we have the correct grade
                const profileRes = await api.get('/users/me');
                if (profileRes.data && profileRes.data.user) {
                    updateUser(profileRes.data.user);
                }

                const currentUser = profileRes.data.user || user;
                const gradeToFetch = currentUser?.grade || 10;

                const [subjectsData, progressData] = await Promise.all([
                    contentApi.getDashboard(gradeToFetch),
                    progressApi.getDashboardProgress(currentUser?.id || '')
                ]);

                // Filter subjects to show only those the user is enrolled in
                // If user.subjects is defined, filter subjectsData to match
                let filteredSubjects = subjectsData;
                if (user?.subjects && user.subjects.length > 0) {
                    filteredSubjects = subjectsData.filter(s =>
                        user.subjects?.includes(s.subject) || user.subjects?.includes(s.id)
                    );
                } else if (!user?.subjects || user.subjects.length === 0) {
                    // If user has no subjects in profile, they are not "enrolled" in anything specific
                    filteredSubjects = [];
                }

                setSubjects(filteredSubjects);
                setProgress(progressData);
            } catch (err) {
                console.error('Failed to load courses:', err);
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
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-500">Loading your learning journey...</p>
                </div>
            </div>
        );
    }



    // No Subjects State
    if (subjects.length === 0) {
        return (
            <div className="container mx-auto px-4 py-12">
                <Card className="max-w-2xl mx-auto p-8 text-center border-blue-100 bg-blue-50">
                    <div className="flex justify-center mb-4">
                        <BookOpen className="w-12 h-12 text-brand-blue" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">My Courses</h1>
                    <p className="text-gray-600 mb-6 text-lg">
                        No subjects available for your grade. Please enroll to start learning.
                    </p>
                    <div className="flex justify-center space-x-4">
                        <Button
                            variant="primary"
                            onClick={() => navigate('/select-subjects')}
                        >
                            Select Subjects
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => navigate('/dashboard')}
                        >
                            Back to Dashboard
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
                    <p className="text-gray-600 mt-2">
                        Tracking your progress in <strong>Grade {user?.grade || 10}</strong>
                    </p>
                </div>
                <div className="hidden sm:block">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-4 h-4 mr-1" /> Enrolled
                    </span>
                </div>
            </header>

            {error && (
                <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
                    {error}
                </div>
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

            <div className="mt-12 p-6 bg-gray-50 rounded-xl border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Need more subjects?</h3>
                <p className="text-gray-600 mb-4">
                    You can always update your subject selection to match your school curriculum.
                </p>
                <Button
                    variant="outline"
                    onClick={() => navigate('/select-subjects')}
                >
                    Update Subject Selection
                </Button>
            </div>
        </div>
    );
};

export default CoursesPage;
