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

import { DashboardPage } from './pages/DashboardPage';
import { SubjectView } from './pages/SubjectView';
import { QuizPlayer } from './components/QuizPlayer';
import { PaymentPage } from './pages/PaymentPage';
import { SubjectSelectionPage } from './pages/SubjectSelectionPage';
import { AIChatPage } from './pages/AIChatPage';
import { CoursesPage } from './pages/CoursesPage';
// ... previous imports

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuthStore();
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
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
                            path="/payment"
                            element={
                                <ProtectedRoute>
                                    <PaymentPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/select-subjects"
                            element={
                                <ProtectedRoute>
                                    <SubjectSelectionPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/ai-chat"
                            element={
                                <ProtectedRoute>
                                    <AIChatPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <DashboardPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/courses"
                            element={
                                <ProtectedRoute>
                                    <CoursesPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/subjects/:id"
                            element={
                                <ProtectedRoute>
                                    <SubjectView />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/quiz/:lessonId"
                            element={
                                <ProtectedRoute>
                                    <QuizPlayer />
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
