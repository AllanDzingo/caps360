import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Check, Loader2 } from 'lucide-react';
import api from '@/services/api';





export const SubjectSelectionPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, updateUser } = useAuthStore();
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
    const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fetchingSubjects, setFetchingSubjects] = useState(true);

    if (import.meta.env.DEV) {
        console.log('API BASE URL:', import.meta.env.VITE_API_URL);
    }

    useEffect(() => {
        // Fetch available subjects from backend
        const fetchSubjects = async () => {
            try {
                const grade = user?.grade || 10;
                const res = await api.get('/subjects', { params: { grade } });
                setAvailableSubjects(res.data.subjects || []);
            } catch (err) {
                console.error('Failed to fetch subjects:', err);
                setAvailableSubjects([]);
                setError('Failed to load available subjects.');
            } finally {
                setFetchingSubjects(false);
            }
        };
        if (user) {
            fetchSubjects();
        }
    }, [user]);

    useEffect(() => {
        // Pre-select user's existing subjects if any
        if (user?.subjects && user.subjects.length > 0) {
            setSelectedSubjects(user.subjects);
        }
    }, [user]);

    const toggleSubject = (subject: string) => {
        if (selectedSubjects.includes(subject)) {
            setSelectedSubjects(selectedSubjects.filter(s => s !== subject));
        } else {
            setSelectedSubjects([...selectedSubjects, subject]);
        }
    };

    const handleSaveSubjects = async () => {
        if (selectedSubjects.length === 0) {
            setError('Please select at least one subject');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await api.patch(
                '/auth/profile',
                { subjects: selectedSubjects }
            );

            if (response.data && response.data.user) {
                updateUser({
                    subjects: response.data.user.subjects,
                    enrollmentStatus: response.data.user.enrollment_status
                });
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error('Failed to save subjects:', err);
            setError(err.response?.data?.error || 'Failed to save subjects. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        navigate('/login');
        return null;
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle className="text-center text-3xl">Select Your Subjects</CardTitle>
                    <p className="text-center text-gray-600 mt-2">
                        Choose the subjects you want to study (Grade {user.grade || 10})
                    </p>
                </CardHeader>

                <CardContent>
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                        {fetchingSubjects ? (
                            <div className="col-span-3 text-center py-12">
                                <Loader2 className="w-10 h-10 animate-spin text-brand-blue mx-auto mb-4" />
                                <p className="text-gray-500">Loading subjects for Grade {user.grade || 10}...</p>
                            </div>
                        ) : availableSubjects.length === 0 ? (
                            <div className="col-span-3 text-center text-gray-500">No subjects available.</div>
                        ) : (
                            availableSubjects.map((subject) => {
                                const isSelected = selectedSubjects.includes(subject);
                                return (
                                    <button
                                        key={subject}
                                        onClick={() => toggleSubject(subject)}
                                        className={`p-4 rounded-lg border-2 transition-all ${isSelected
                                            ? 'border-brand-blue bg-blue-50 text-brand-blue'
                                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">{subject}</span>
                                            {isSelected && <Check className="w-5 h-5" />}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-600">
                            {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''} selected
                        </p>
                        <div className="space-x-3">
                            <Button
                                variant="outline"
                                onClick={() => navigate('/dashboard')}
                                disabled={loading}
                            >
                                Skip for now
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleSaveSubjects}
                                disabled={loading || selectedSubjects.length === 0}
                            >
                                {loading ? (
                                    'Saving...'
                                ) : (
                                    'Continue to Dashboard'
                                )}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
