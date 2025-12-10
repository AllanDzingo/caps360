import React from 'react';
import { getTierBadgeClass } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'trial' | 'premium' | 'tier';
    tier?: string;
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'default',
    tier,
    className,
}) => {
    const baseStyles = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium';

    const variants = {
        default: 'bg-gray-100 text-gray-800',
        trial: 'bg-purple-100 text-purple-800',
        premium: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-900',
        tier: tier ? getTierBadgeClass(tier) : 'bg-gray-100 text-gray-800',
    };

    return (
        <span className={cn(baseStyles, variants[variant], className)}>
            {children}
        </span>
    );
};
