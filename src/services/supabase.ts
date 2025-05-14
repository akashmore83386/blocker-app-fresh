import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types';

// Replace with your Supabase URL and anon key
const supabaseUrl = 'https://vycuwfubngfomhshnjrx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5Y3V3ZnVibmdmb21oc2huanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MTAxNjgsImV4cCI6MjA2MjM4NjE2OH0.mFB0yODC2xCxmudQhhJTgABy-DA5hYlh9rRWguUta3U';

// SecureStore adapter for Supabase
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Authentication functions
export const signUp = async (email: string, password: string) => {
  return await supabase.auth.signUp({
    email,
    password,
  });
};

export const signIn = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data.user;
};

// User profile functions
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data as User;
};

export const updateUserProfile = async (userId: string, updates: Partial<User>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  
  if (error) throw error;
  return data;
};

// App usage data functions
export const saveAppUsage = async (userId: string, appId: string, minutes: number) => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const { data, error } = await supabase
    .from('app_usage')
    .upsert({
      user_id: userId,
      app_id: appId,
      date: today,
      minutes: minutes,
    }, {
      onConflict: 'user_id,app_id,date',
    });
  
  if (error) throw error;
  return data;
};

export const getAppUsage = async (userId: string, startDate?: string, endDate?: string) => {
  let query = supabase
    .from('app_usage')
    .select('*')
    .eq('user_id', userId);
  
  if (startDate) {
    query = query.gte('date', startDate);
  }
  
  if (endDate) {
    query = query.lte('date', endDate);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
};

// Payment related functions
export const savePayment = async (paymentDetails: Omit<import('../types').PaymentDetails, 'id' | 'createdAt'>) => {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      user_id: paymentDetails.userId,
      amount: paymentDetails.amount,
      status: paymentDetails.status,
      app_id: paymentDetails.appId,
      unlock_duration: paymentDetails.unlockDuration,
    });
  
  if (error) throw error;
  return data;
};

export const updatePaymentStatus = async (paymentId: string, status: 'completed' | 'refunded') => {
  const updates: any = { status };
  
  if (status === 'refunded') {
    updates.refunded_at = new Date().toISOString();
  }
  
  const { data, error } = await supabase
    .from('payments')
    .update(updates)
    .eq('id', paymentId);
  
  if (error) throw error;
  return data;
};
