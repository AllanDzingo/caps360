import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { subscriptionAPI } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export const SignupPage: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<'details' | 'trial-choice'>('details');
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'student',
        grade: 10,
    });

    const registerMutation = useMutation({
        mutationFn: async (data: any) => {
            const { error, data: authData } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        first_name: data.firstName,
                        last_name: data.lastName,
                        role: data.role,
                        grade: data.grade,
                    },
                },
            });
            if (error) throw error;
            return authData;
        },
        onSuccess: () => {
            setStep('trial-choice');
        },
        onError: (error: any) => {
            alert(error.message || 'Registration failed');
        },
    });

    const trialMutation = useMutation({
        mutationFn: subscriptionAPI.startTrial,
        onSuccess: () => {
            navigate('/dashboard');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        registerMutation.mutate(formData);
    };

    const handleTrialChoice = (startTrial: boolean) => {
        if (startTrial) {
            trialMutation.mutate();
        } else {
            navigate('/pricing');
        }
    };

    if (step === 'trial-choice') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-brand-blue to-brand-teal flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <CardTitle className="text-center">Choose Your Path</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Free Trial Option */}
                            <div className="border-2 border-purple-300 rounded-xl p-6 hover:border-purple-500 transition">
                                <Badge variant="trial" className="mb-4">
                                    Recommended
                                </Badge>
                                <h3 className="text-2xl font-bold mb-2">Start Free Trial</h3>
                                <p className="text-gray-600 mb-4">
                                    Get 14 days of full Premium access. No credit card required.
                                </p>
                                <ul className="space-y-2 mb-6 text-sm text-gray-700">
                                    <li>✓ All Premium features</li>
                                    <li>✓ No payment now</li>
                                    <li>✓ Cancel anytime</li>
                                </ul>
                                <Button
                                    variant="primary"
                                    className="w-full"
                                    onClick={() => handleTrialChoice(true)}
                                    disabled={trialMutation.isPending}
                                >
                                    Start Free Trial
                                </Button>
                            </div>

                            {/* Immediate Payment Option */}
                            <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-brand-blue transition">
                                <h3 className="text-2xl font-bold mb-2">Choose a Plan</h3>
                                <p className="text-gray-600 mb-4">
                                    Pay now and get 14 days of Welcome Premium, then your chosen tier.
                                </p>
                                <ul className="space-y-2 mb-6 text-sm text-gray-700">
                                    <li>✓ Welcome Premium bonus</li>
                                    <li>✓ Immediate access</li>
                                    <li>✓ Flexible plans</li>
                                </ul>
                                <Button
                                    variant="secondary"
                                    className="w-full"
                                    onClick={() => handleTrialChoice(false)}
                                >
                                    View Plans
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-blue to-brand-teal flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-center">Join CAPS360</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="input"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="input"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                required
                                className="input"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                className="input"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                I am a
                            </label>
                            <select
                                className="input"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                                <option value="parent">Parent</option>
                            </select>
                        </div>

                        {formData.role === 'student' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Grade
                                </label>
                                <select
                                    className="input"
                                    value={formData.grade}
                                    onChange={(e) => setFormData({ ...formData, grade: parseInt(e.target.value) })}
                                >
                                    {[...Array(12)].map((_, i) => (
                                        <option key={i + 1} value={i + 1}>
                                            Grade {i + 1}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full"
                            disabled={registerMutation.isPending}
                        >
                            {registerMutation.isPending ? 'Creating account...' : 'Create Account'}
                        </Button>

                        <p className="text-center text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link to="/login" className="text-brand-blue font-semibold hover:underline">
                                Login
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};
