import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, hover = false }) => {
    return (
        <div
            className={cn(
                'bg-white rounded-xl shadow-lg p-6 border border-gray-100',
                hover && 'transition-transform duration-200 hover:scale-105 hover:shadow-xl',
                className
            )}
        >
            {children}
        </div>
    );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className,
}) => {
    return <div className={cn('mb-4', className)}>{children}</div>;
};

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className,
}) => {
    return <h3 className={cn('text-2xl font-bold text-gray-900', className)}>{children}</h3>;
};

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className,
}) => {
    return <div className={cn('text-gray-600', className)}>{children}</div>;
};
