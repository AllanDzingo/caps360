import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Check, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PaystackButton } from 'react-paystack';

interface PricingTier {
    name: string;
    price: number;
    tier: 'study_help' | 'standard' | 'premium';
    features: string[];
    highlighted?: boolean;
}

const tiers: PricingTier[] = [
    {
        name: 'Study Help',
        price: 3900,
        tier: 'study_help',
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
        tier: 'standard',
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
        tier: 'premium',
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

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

export const PaymentPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, updateUser } = useAuthStore();
    const [processing, setProcessing] = useState(false);

    if (!user) {
        navigate('/login');
        return null;
    }

    const handlePaystackSuccess = async (reference: any, tier: string) => {
        setProcessing(true);
        try {
            // Call backend to verify payment and update subscription
            const response = await fetch('/api/subscriptions/paid/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                },
                body: JSON.stringify({
                    tier,
                    paystackSubscriptionId: reference.reference,
                    paystackCustomerCode: reference.trans,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                // Update local user state
                updateUser({ currentTier: tier });
                // Redirect to subject selection
                navigate('/select-subjects');
            } else {
                alert('Payment verification failed. Please contact support.');
            }
        } catch (error) {
            console.error('Payment verification error:', error);
            alert('An error occurred. Please contact support.');
        } finally {
            setProcessing(false);
        }
    };

    const handlePaystackClose = () => {
        console.log('Payment closed');
    };

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    Choose Your Plan
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    Select a subscription tier to unlock your learning journey
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {tiers.map((tier) => {
                    const config = {
                        reference: new Date().getTime().toString(),
                        email: user.email,
                        amount: tier.price * 100, // Paystack expects amount in kobo (cents)
                        publicKey: PAYSTACK_PUBLIC_KEY,
                        metadata: {
                            custom_fields: [
                                {
                                    display_name: 'User ID',
                                    variable_name: 'user_id',
                                    value: user.id,
                                },
                                {
                                    display_name: 'Tier',
                                    variable_name: 'tier',
                                    value: tier.tier,
                                },
                            ],
                        },
                    };

                    return (
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
                                    <span className="text-gray-600">/month</span>
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

                                {PAYSTACK_PUBLIC_KEY ? (
                                    <PaystackButton
                                        {...config}
                                        text={processing ? 'Processing...' : 'Subscribe Now'}
                                        onSuccess={(reference) => handlePaystackSuccess(reference, tier.tier)}
                                        onClose={handlePaystackClose}
                                        className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                                            tier.highlighted
                                                ? 'bg-brand-blue text-white hover:bg-blue-700'
                                                : 'bg-gray-900 text-white hover:bg-gray-800'
                                        } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        disabled={processing}
                                    />
                                ) : (
                                    <Button
                                        variant={tier.highlighted ? 'premium' : 'primary'}
                                        className="w-full"
                                        onClick={() => alert('Payment gateway not configured. Please contact administrator.')}
                                    >
                                        Subscribe Now
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="text-center mt-12">
                <p className="text-gray-600">
                    All plans include a <span className="font-semibold text-brand-blue">14-day free trial</span>
                </p>
                <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => navigate('/dashboard')}
                >
                    Skip for now (limited access)
                </Button>
            </div>
        </div>
    );
};
