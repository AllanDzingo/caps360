import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
    return `R${(amount / 100).toFixed(2)}`;
}

export function getTierColor(tier: string): string {
    switch (tier.toLowerCase()) {
        case 'study_help':
            return 'text-tier-study';
        case 'standard':
            return 'text-tier-standard';
        case 'premium':
            return 'text-tier-premium';
        default:
            return 'text-gray-600';
    }
}

export function getTierBadgeClass(tier: string): string {
    switch (tier.toLowerCase()) {
        case 'study_help':
            return 'bg-gray-100 text-gray-800';
        case 'standard':
            return 'bg-blue-100 text-blue-800';
        case 'premium':
            return 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-900';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}
