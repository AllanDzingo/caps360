import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { contentApi } from '../lib/api';
import { Loader2, ChevronLeft, BookOpen } from 'lucide-react';

export const SubjectView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [subject, setSubject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        const fetchSubject = async () => {
            try {
                const data = await contentApi.getSubject(id);
                setSubject(data);
            } catch (err) {
                console.error('Failed to load subject:', err);
                setError('Failed to load content.');
            } finally {
                setLoading(false);
            }
        };

        fetchSubject();
    }, [id]);

    if (loading) return (
        <div className="flex h-[50vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
    );

    if (error || !subject) return (
        <div className="container mx-auto px-4 py-8 text-center">
            <p className="text-red-600">{error || 'Subject not found'}</p>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8">
            <Link to="/dashboard" className="inline-flex items-center text-gray-500 hover:text-blue-600 mb-6 transition-colors">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
            </Link>

            <header className="mb-8 border-b pb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{subject.title}</h1>
                <p className="text-gray-600">{subject.description}</p>
            </header>

            <div className="space-y-6">
                {subject.topics?.map((topic: any) => (
                    <div key={topic.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="font-semibold text-lg text-gray-800">{topic.title}</h2>
                            {/* <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Topic {topic.order}</span> */}
                        </div>
                        <div className="p-0">
                            {topic.lessons?.map((lesson: any, index: number) => (
                                <div key={lesson.id} className={`
                                    flex items-center justify-between p-4 hover:bg-blue-50 transition-colors
                                    ${index !== topic.lessons.length - 1 ? 'border-b border-gray-50' : ''}
                                `}>
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                            <BookOpen className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-gray-900">{lesson.title}</h3>
                                            {/* <p className="text-xs text-gray-500 line-clamp-1">{lesson.description}</p> */}
                                        </div>
                                    </div>
                                    <Link
                                        to={`/quiz/${lesson.id}`}
                                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                                    >
                                        Start
                                    </Link>
                                </div>
                            ))}
                            {(!topic.lessons || topic.lessons.length === 0) && (
                                <div className="p-4 text-center text-gray-400 italic text-sm">
                                    No lessons available yet.
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
