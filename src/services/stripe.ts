import { initStripe, useStripe } from '@stripe/stripe-react-native';
import { savePayment, updatePaymentStatus } from './supabase';
import { PaymentDetails } from '../types';

// Import environment variables from config
import { STRIPE_PUBLISHABLE_KEY, BACKEND_API_URL } from '../config/env';

// Use Stripe publishable key and backend API URL from environment variables
const stripePublishableKey = STRIPE_PUBLISHABLE_KEY();
const backendApiUrl = BACKEND_API_URL();

// Initialize Stripe
export const initializeStripe = async () => {
  return initStripe({
    publishableKey: stripePublishableKey,
    merchantIdentifier: 'merchant.com.screenblocker',
    urlScheme: 'screenblocker',
  });
};

// Process emergency unlock payment
export const processEmergencyUnlock = async (
  userId: string,
  appId: string,
  amount: number,
  unlockDuration: number
): Promise<PaymentDetails | null> => {
  try {
    const stripe = useStripe();

    // Create a payment intent using our backend service
    const response = await fetch(`${backendApiUrl}/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount * 100, // Convert to cents for Stripe
        userId,
        appId,
        unlockDuration,
      }),
    });

    const { clientSecret } = await response.json();

    // Initialize the payment sheet
    const { error: initError } = await stripe.initPaymentSheet({
      paymentIntentClientSecret: clientSecret,
      merchantDisplayName: 'Screen Blocker App',
      style: 'automatic',
    });

    if (initError) {
      console.error('Error initializing payment sheet:', initError);
      return null;
    }

    // Present the payment sheet
    const { error: presentError } = await stripe.presentPaymentSheet();

    if (presentError) {
      console.error('Error presenting payment sheet:', presentError);
      return null;
    }

    // If payment successful, save to Supabase
    const paymentDetails = {
      userId,
      amount,
      status: 'completed' as const,
      appId,
      unlockDuration,
    };

    await savePayment(paymentDetails);

    // The refund will be automatically processed by our backend service after 7 days
    // We'll just update the status in our database when we get the webhook event
    console.log('Payment successful. Refund will be processed after 7 days');

    return {
      id: 'temporary-id', // In a real app, this would be the actual payment ID from the database
      createdAt: new Date().toISOString(),
      ...paymentDetails,
    };
  } catch (error) {
    console.error('Error processing payment:', error);
    return null;
  }
};

// Calculate refund amount (90% of original payment)
export const calculateRefundAmount = (originalAmount: number): number => {
  return originalAmount * 0.9; // 90% refund
};

// Calculate app revenue (10% of original payment)
export const calculateAppRevenue = (originalAmount: number): number => {
  return originalAmount * 0.1; // 10% app revenue
};
