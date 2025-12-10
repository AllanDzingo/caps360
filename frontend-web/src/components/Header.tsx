import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { LogOut } from 'lucide-react';

export const Header: React.FC = () => {
    const { user, isAuthenticated, logout } = useAuthStore();

    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-2">
                        <div className="w-10 h-10 bg-gradient-to-r from-brand-teal to-brand-blue rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-xl">C</span>
                        </div>
                        <span className="text-2xl font-bold text-brand-navy">CAPS360</span>
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center space-x-6">
                        {isAuthenticated ? (
                            <>
                                <Link to="/dashboard" className="text-gray-700 hover:text-brand-blue transition">
                                    Dashboard
                                </Link>
                                <Link to="/courses" className="text-gray-700 hover:text-brand-blue transition">
                                    Courses
                                </Link>
                                {user?.effectiveTier !== 'study_help' && (
                                    <Link to="/ai-tutor" className="text-gray-700 hover:text-brand-blue transition">
                                        AI Tutor
                                    </Link>
                                )}
                                {user?.effectiveTier === 'premium' && (
                                    <>
                                        <Link to="/teacher" className="text-gray-700 hover:text-brand-blue transition">
                                            Teacher Portal
                                        </Link>
                                        <Link to="/parent" className="text-gray-700 hover:text-brand-blue transition">
                                            Parent Portal
                                        </Link>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <Link to="/features" className="text-gray-700 hover:text-brand-blue transition">
                                    Features
                                </Link>
                                <Link to="/pricing" className="text-gray-700 hover:text-brand-blue transition">
                                    Pricing
                                </Link>
                            </>
                        )}
                    </nav>

                    {/* User Menu */}
                    <div className="flex items-center space-x-4">
                        {isAuthenticated && user ? (
                            <>
                                {/* Trial/Premium Badges */}
                                {user.trialPremium && (
                                    <Badge variant="trial">Free Trial</Badge>
                                )}
                                {user.welcomePremium && (
                                    <Badge variant="premium">Welcome Premium</Badge>
                                )}

                                {/* User Info */}
                                <div className="flex items-center space-x-3">
                                    <div className="text-right hidden md:block">
                                        <p className="text-sm font-medium text-gray-900">
                                            {user.firstName} {user.lastName}
                                        </p>
                                        <p className="text-xs text-gray-500 capitalize">
                                            {user.effectiveTier.replace('_', ' ')}
                                        </p>
                                    </div>
                                    <Button variant="secondary" size="sm" onClick={logout}>
                                        <LogOut className="w-4 h-4" />
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <Link to="/login">
                                    <Button variant="outline" size="sm">
                                        Login
                                    </Button>
                                </Link>
                                <Link to="/signup">
                                    <Button variant="primary" size="sm">
                                        Get Started
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};
