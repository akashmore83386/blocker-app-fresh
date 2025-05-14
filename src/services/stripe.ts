import { initStripe, useStripe } from '@stripe/stripe-react-native';
import { savePayment, updatePaymentStatus } from './supabase';
import { PaymentDetails } from '../types';

// Replace with your Stripe publishable key
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51LHsj3SEsUZ5jintpDAOukCZTqt11NAjvggrFdRGV7H3Z0yQanSkf0Sp6bjNEZDE7nFKNTnGYfaOWVInL02MTuVK00g9AEPACg';

// Initialize Stripe
export const initializeStripe = async () => {
  return initStripe({
    publishableKey: STRIPE_PUBLISHABLE_KEY,
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

    // First, create a payment intent from your backend
    // Note: You would typically have an API endpoint that creates a payment intent
    const response = await fetch('YOUR_BACKEND_API/create-payment-intent', {
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

    // Schedule refund after 7 days (this would be handled by a backend job)
    // Just mocking here, but in a real application, you'd set up a background job
    // through your backend to process this
    setTimeout(async () => {
      // In a real app, you'd have a proper paymentId here from the saved payment
      // await updatePaymentStatus(paymentId, 'refunded');
      console.log('Payment refunded');
    }, 7 * 24 * 60 * 60 * 1000); // 7 days

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
