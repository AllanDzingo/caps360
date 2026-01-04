import React from 'react';
import { Subject } from '../lib/api';
import { ProgressRing } from './ProgressRing';
import { Link } from 'react-router-dom';

interface SubjectTileProps {
    subject: Subject;
    progress?: number;
}

export const SubjectTile: React.FC<SubjectTileProps> = ({ subject, progress = 0 }) => {
    return (
        <Link to={`/subjects/${subject.id}`} className="block group">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md hover:border-blue-100 flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {subject.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        {subject.description || `Grade ${subject.grade} ${subject.subject}`}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
                            Grade {subject.grade}
                        </span>
                        {/* 
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                             {subject.totalLessons || 0} Lessons
                        </span>
                        */}
                    </div>
                </div>
                <div className="ml-4">
                    <ProgressRing progress={progress} />
                </div>
            </div>
        </Link>
    );
};
