import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import api from '@/services/api';





export const SubjectSelectionPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, updateUser } = useAuthStore();
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
    const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fetchingSubjects, setFetchingSubjects] = useState(true);
    const [showDisclaimer, setShowDisclaimer] = useState(false);

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
                    subjects: response.data.user.subjects
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
                                onClick={() => setShowDisclaimer(true)}
                                disabled={loading || selectedSubjects.length === 0}
                            >
                                Continue to Dashboard
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Disclaimer Modal */}
            {showDisclaimer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-center mb-6">
                            <div className="p-3 bg-blue-50 rounded-full">
                                <AlertCircle className="w-12 h-12 text-blue-600" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-center text-gray-900 mb-4">Educational Disclaimer</h2>
                        <div className="bg-gray-50 border border-gray-100 rounded-lg p-6 mb-8">
                            <p className="text-gray-700 leading-relaxed text-center italic">
                                “CAPS360 AI is designed to support learning and revision.
                                It does not replace teachers, tutors, or formal classroom instruction.
                                By continuing, you acknowledge that this platform is an educational aid and not a substitute for teaching.”
                            </p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <Button
                                variant="primary"
                                className="w-full text-lg py-6"
                                onClick={handleSaveSubjects}
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : 'I Acknowledge and Agree'}
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setShowDisclaimer(false)}
                                disabled={loading}
                            >
                                Go Back
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
