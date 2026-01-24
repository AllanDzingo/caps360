import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Check } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PricingTier {
    name: string;
    price: number;
    period: string;
    features: string[];
    highlighted?: boolean;
}

const tiers: PricingTier[] = [
    {
        name: 'Study Help',
        price: 3900,
        period: 'month',
        features: [
            'Basic quiz access',
            'Limited AI assistance (5 questions/day)',
            'Video lessons (Grade-specific)',
            'PDF study materials',
            'Progress tracking',
        ],
    },
    {
        name: 'Standard CAPS360',
        price: 9900,
        period: 'month',
        highlighted: true,
        features: [
            'Everything in Study Help',
            'Unlimited AI Tutor Chat',
            'Unlimited quiz generation',
            'All video lessons',
            'Assignment submissions',
            'Detailed analytics',
        ],
    },
    {
        name: 'Premium CAPS360',
        price: 14900,
        period: 'month',
        features: [
            'Everything in Standard',
            'Teacher Portal (class management)',
            'Parent Dashboard (child progress)',
            'AI Marking Assistant',
            'Curriculum Planner',
            'Priority support',
        ],
    },
];

export const PricingSection: React.FC = () => {
    return (
        <section className="py-20 bg-gradient-to-b from-white to-gray-50">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">
                        Choose Your Learning Journey
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Start with a 14-day free trial of Premium, or jump right in with immediate access
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {tiers.map((tier) => (
                        <Card
                            key={tier.name}
                            className={tier.highlighted ? 'border-2 border-brand-blue shadow-2xl' : ''}
                            hover
                        >
                            {tier.highlighted && (
                                <div className="bg-brand-blue text-white text-center py-2 -mt-6 -mx-6 mb-6 rounded-t-xl font-semibold">
                                    Most Popular
                                </div>
                            )}

                            <CardHeader>
                                <CardTitle className="text-center">{tier.name}</CardTitle>
                                <div className="text-center mt-4">
                                    <span className="text-4xl font-bold text-gray-900">
                                        {formatCurrency(tier.price)}
                                    </span>
                                    <span className="text-gray-600">/{tier.period}</span>
                                </div>
                            </CardHeader>

                            <CardContent>
                                <ul className="space-y-3 mb-6">
                                    {tier.features.map((feature, index) => (
                                        <li key={index} className="flex items-start">
                                            <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Link to="/payment" className="block">
                                    <Button
                                        variant={tier.highlighted ? 'premium' : 'primary'}
                                        className="w-full"
                                    >
                                        Get Started
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="text-center mt-12">
                    <p className="text-gray-600">
                        All plans include a <span className="font-semibold text-brand-blue">14-day free trial</span> of Premium features
                    </p>
                </div>
            </div>
        </section>
    );
};
