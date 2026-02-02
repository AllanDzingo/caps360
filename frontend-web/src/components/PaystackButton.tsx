import React, { useEffect, useState } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { Button } from '@/components/ui/Button';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';

interface PaystackButtonProps {
    tier: string;
    className?: string;
    text?: string;
}

export const PaystackButton: React.FC<PaystackButtonProps> = ({
    tier,
    className,
    text = "Subscribe Now"
}) => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [config, setConfig] = useState<any>(null);
    const [initializing, setInitializing] = useState(true);

    // Initialize payment configuration on mount to get access_code
    useEffect(() => {
        const initPayment = async () => {
            try {
                if (!user?.email) return;

                // Call backend to initialize transaction and get access code
                // This ensures the amount is set securely by the backend based on the tier
                const { data } = await api.post('/payments/paystack/initialize', {
                    tier,
                    email: user.email
                });

                if (data && data.access_code) {
                    setConfig({
                        reference: data.reference,
                        email: user.email,
                        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
                        accessCode: data.access_code,
                        amount: data.amount, // Optional with access_code but good for reference
                    });
                }
            } catch (error) {
                console.error('Failed to initialize Paystack transaction:', error);
            } finally {
                setInitializing(false);
            }
        };

        initPayment();
    }, [tier, user?.email]);

    // Hook must be called unconditionally, but we can't pass null config usually.
    // However, we only trigger it when config is ready.
    // NOTE: usePaystackPayment might complain if config is empty.
    // construct a dummy config if null to satisfy types/hook, but prevent checking.
    const paystackConfig = config || {
        reference: new Date().getTime().toString(),
        email: "placeholder@example.com",
        amount: 0,
        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_placeholder",
    };

    const initializePaystack = usePaystackPayment(paystackConfig);

    const onSuccess = (reference: any) => {
        // Redirect immediately to success page for UX
        // We do NOT verification here to unlock access (backend webhook does that)
        // We pass the reference to the success page if it wants to poll or show it
        navigate(`/payment/success?reference=${reference.reference}`);
    };

    const onClose = () => {
        // console.log('Payment closed');
    };

    const handleClick = () => {
        if (config) {
            initializePaystack({ onSuccess, onClose });
        } else {
            // Retry initialization if it failed?
            // For now, just alert or log
            alert('Unable to initialize payment. Please refresh and try again.');
        }
    };

    return (
        <Button
            className={className}
            onClick={handleClick}
            disabled={initializing || !config}
            variant={tier === 'premium' || tier === 'standard' ? 'premium' : 'primary'} // Approximation of variant logic
        >
            {initializing ? 'Loading...' : text}
        </Button>
    );
};
