import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { PricingSection } from '@/components/PricingSection';
import { Brain, BookOpen, Award, Users, Sparkles, TrendingUp } from 'lucide-react';

export const LandingPage: React.FC = () => {
    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-brand-navy via-brand-blue to-brand-teal text-white py-20 overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-brand-yellow rounded-full blur-3xl"></div>
                    <div className="absolute bottom-20 right-10 w-96 h-96 bg-brand-teal rounded-full blur-3xl"></div>
                </div>

                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="mb-8 animate-fade-in">
                            <img
                                src="/logo.png"
                                alt="CAPS360 Logo"
                                className="w-32 h-32 mx-auto mb-6"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        </div>

                        <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-slide-up">
                            Master the CAPS Curriculum with{' '}
                            <span className="text-gradient from-brand-yellow to-brand-teal">AI-Powered Learning</span>
                        </h1>

                        <p className="text-xl md:text-2xl mb-8 text-gray-100 animate-slide-up">
                            South Africa's premier educational platform for students, teachers, and parents
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
                            <Link to="/signup">
                                <Button variant="premium" size="lg">
                                    Start Free Trial
                                </Button>
                            </Link>
                            <Link to="/pricing">
                                <Button variant="outline" size="lg" className="bg-white text-brand-blue hover:bg-gray-100">
                                    View Pricing
                                </Button>
                            </Link>
                        </div>

                        <p className="mt-6 text-sm text-gray-200">
                            14-day free trial • No credit card required • Cancel anytime
                        </p>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">
                            Everything You Need to Excel
                        </h2>
                        <p className="text-xl text-gray-600">
                            Powered by cutting-edge AI and aligned with CAPS standards
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        <FeatureCard
                            icon={<Brain className="w-12 h-12 text-brand-blue" />}
                            title="AI Tutor Chat"
                            description="Get instant, personalized help from our AI tutor trained on CAPS curriculum"
                        />
                        <FeatureCard
                            icon={<BookOpen className="w-12 h-12 text-brand-teal" />}
                            title="Smart Quiz Generator"
                            description="Generate unlimited practice quizzes tailored to your grade and subject"
                        />
                        <FeatureCard
                            icon={<Award className="w-12 h-12 text-brand-yellow" />}
                            title="AI Marking Assistant"
                            description="Get instant feedback on assignments with detailed, constructive comments"
                        />
                        <FeatureCard
                            icon={<Users className="w-12 h-12 text-brand-red" />}
                            title="Teacher Portal"
                            description="Manage classes, track progress, and create lesson plans effortlessly"
                        />
                        <FeatureCard
                            icon={<TrendingUp className="w-12 h-12 text-brand-blue" />}
                            title="Progress Analytics"
                            description="Track learning progress with detailed insights and recommendations"
                        />
                        <FeatureCard
                            icon={<Sparkles className="w-12 h-12 text-brand-teal" />}
                            title="Curriculum Planner"
                            description="AI-generated lesson plans aligned with CAPS for teachers"
                        />
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <PricingSection />

            {/* Compliance: What CAPS360 Offers Section */}
            <section className="py-12 bg-gray-50 border-t">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-2xl md:text-3xl font-bold mb-4 text-brand-blue">What CAPS360 Offers</h2>
                    <p className="text-lg mb-2 text-gray-700">
                        CAPS360 is a digital education platform for learners, parents, and tutors. We provide curriculum-aligned content, AI-powered support, and digital learning resources.
                    </p>
                    <ul className="list-disc pl-6 mb-4 text-gray-700 text-left max-w-2xl mx-auto">
                        <li>Digital educational services and resources</li>
                        <li>Subscription or once-off payments for premium features</li>
                        <li>No physical shipping – all services are delivered online</li>
                    </ul>
                    <Link to="/what-caps360-offers" className="text-brand-blue underline hover:text-brand-teal">Read full details</Link>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-brand-blue to-brand-teal text-white">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-4xl font-bold mb-6">
                        Ready to Transform Your Learning?
                    </h2>
                    <p className="text-xl mb-8 max-w-2xl mx-auto">
                        Join thousands of South African students already excelling with CAPS360
                    </p>
                    <Link to="/signup">
                        <Button variant="premium" size="lg">
                            Start Your Free Trial Today
                        </Button>
                    </Link>
                </div>
            </section>
        </div>
    );
};

const FeatureCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
}> = ({ icon, title, description }) => {
    return (
        <div className="text-center p-6 rounded-xl hover:bg-gray-50 transition-all duration-200">
            <div className="flex justify-center mb-4">{icon}</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600">{description}</p>
        </div>
    );
};
