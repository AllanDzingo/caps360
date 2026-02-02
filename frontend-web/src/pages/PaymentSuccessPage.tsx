import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import api from '@/services/api';

export const PaymentSuccessPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const reference = searchParams.get('reference');
    const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'success' | 'failed' | 'manual'>('verifying');

    useEffect(() => {
        const verifyTransaction = async () => {
            if (!reference) {
                setVerificationStatus('manual'); // No reference provided
                return;
            }

            try {
                // Secondary UX verification check
                // This does NOT grant access, just confirms status for the user
                const { data } = await api.get(`/payments/paystack/verify/${reference}`);

                if (data.status === 'success') {
                    setVerificationStatus('success');
                } else {
                    // Could be 'abandoned' or 'failed'
                    setVerificationStatus('failed');
                }
            } catch (error) {
                console.error('Verification check failed:', error);
                // If the check fails (e.g. network), we still show success potentially if we assume optimistic,
                // BUT better to just show "Processing" state or manual confirmation instructions
                // "manual" implies "We received your payment request, check dashboard"
                setVerificationStatus('manual');
            }
        };

        verifyTransaction();
    }, [reference]);

    return (
        <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[60vh] text-center">
            {verificationStatus === 'verifying' && (
                <>
                    <Loader2 className="w-16 h-16 text-brand-blue animate-spin mb-6" />
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Processing Payment...</h1>
                    <p className="text-gray-600 max-w-md">
                        Please wait while we confirm your transaction. This should only take a moment.
                    </p>
                </>
            )}

            {(verificationStatus === 'success' || verificationStatus === 'manual') && (
                <>
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-8">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>

                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Payment Successful!</h1>

                    <p className="text-xl text-gray-600 max-w-lg mb-8">
                        Thank you for your subscription. Your access is being unlocked.
                        {verificationStatus === 'manual' && " (It may take a few minutes to reflect on your dashboard)."}
                    </p>

                    <div className="space-y-4">
                        <Button
                            size="lg"
                            onClick={() => navigate('/dashboard')}
                            className="bg-brand-blue hover:bg-blue-700 min-w-[200px]"
                        >
                            Go to Dashboard <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>

                        <div className="block mt-4">
                            <Button
                                variant="outline"
                                onClick={() => navigate('/select-subjects')}
                            >
                                Select Subjects
                            </Button>
                        </div>
                    </div>
                </>
            )}

            {verificationStatus === 'failed' && (
                <>
                    <h1 className="text-3xl font-bold text-red-600 mb-4">Payment Verification Failed</h1>
                    <p className="text-gray-600 max-w-md mb-8">
                        We couldn't confirm your payment status immediately. If you have been charged, please contact support.
                    </p>
                    <Button variant="outline" onClick={() => navigate('/contact-us')}>
                        Contact Support
                    </Button>
                </>
            )}
        </div>
    );
};
