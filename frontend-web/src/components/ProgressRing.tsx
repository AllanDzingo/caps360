import React from 'react';

interface ProgressRingProps {
    progress: number;
    size?: number;
    stroke?: number;
    color?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
    progress,
    size = 60,
    stroke = 4,
    color = 'text-blue-600'
}) => {
    const radius = size / 2 - stroke;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg
                className="transform -rotate-90"
                width={size}
                height={size}
            >
                <circle
                    className="text-gray-200"
                    strokeWidth={stroke}
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    className={color}
                    strokeWidth={stroke}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
            </svg>
            <span className="absolute text-xs font-semibold">{Math.round(progress)}%</span>
        </div>
    );
};
