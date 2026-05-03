import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { toast } from 'sonner';

const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY || "pk_test_sample";
const stripePromise = loadStripe(STRIPE_PUBLIC_KEY);

export const handleStripeCheckout = async (featureName: string, onComplete: () => Promise<void>, setProcessing: (val: boolean) => void) => {
  setProcessing(true);
  try {
    const stripe = await stripePromise;
    if (!stripe) throw new Error("Stripe failed to load");

    // Simulated Stripe flow for demo
    toast.info("Opening Stripe (Test Mode)...");
    
    // In production, this would redirect to a real Stripe Checkout Session
    setTimeout(async () => {
      await onComplete();
    }, 2000);
  } catch (err: any) {
    toast.error(err.message);
    setProcessing(false);
  }
};

export const StripeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
};
