import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { useAuthStore } from './store/authStore';
import WhatCAPS360Offers from './pages/WhatCAPS360Offers';
import TermsAndConditions from './pages/TermsAndConditions';
import PrivacyPolicy from './pages/PrivacyPolicy';
import RefundPolicy from './pages/RefundPolicy';
import FAQs from './pages/FAQs';
import ServiceDeliveryPolicy from './pages/ServiceDeliveryPolicy';
import ContactUs from './pages/ContactUs';
import Footer from './components/Footer';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuthStore();
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

// Placeholder Dashboard
const DashboardPage: React.FC = () => {
    const { user } = useAuthStore();
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-4">Welcome, {user?.firstName}!</h1>
            <p className="text-gray-600">
                Your tier: <span className="font-semibold capitalize">{user?.effectiveTier.replace('_', ' ')}</span>
            </p>
            {user?.trialPremium && (
                <p className="text-purple-600 mt-2">🎉 You're on a free trial until {user.trialEndDate}</p>
            )}
            {user?.welcomePremium && (
                <p className="text-yellow-600 mt-2">✨ Welcome Premium active until {user.welcomePremiumEndDate}</p>
            )}
        </div>
    );
};

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <div className="min-h-screen bg-gray-50">
                    <Header />
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/signup" element={<SignupPage />} />
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <DashboardPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route path="/what-caps360-offers" element={<WhatCAPS360Offers />} />
                        <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                        <Route path="/refund-policy" element={<RefundPolicy />} />
                        <Route path="/faqs" element={<FAQs />} />
                        <Route path="/service-delivery-policy" element={<ServiceDeliveryPolicy />} />
                        <Route path="/contact-us" element={<ContactUs />} />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                    <Footer />
                </div>
            </BrowserRouter>
        </QueryClientProvider>
    );
}

export default App;
