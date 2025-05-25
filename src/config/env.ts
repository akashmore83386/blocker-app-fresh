import { Platform } from 'react-native';
import {
  SUPABASE_URL as ENV_SUPABASE_URL,
  SUPABASE_ANON_KEY as ENV_SUPABASE_ANON_KEY,
  STRIPE_PUBLISHABLE_KEY as ENV_STRIPE_PUBLISHABLE_KEY,
  BACKEND_API_URL as ENV_BACKEND_API_URL
} from '@env';

// Default configuration values (non-sensitive development defaults)
const defaultConfig = {
  SUPABASE_URL: ENV_SUPABASE_URL || 'Missing Supabase URL - check .env file',
  SUPABASE_ANON_KEY: ENV_SUPABASE_ANON_KEY || 'Missing Supabase Anon Key - check .env file',
  STRIPE_PUBLISHABLE_KEY: ENV_STRIPE_PUBLISHABLE_KEY || 'Missing Stripe Publishable Key - check .env file',
  BACKEND_API_URL: ENV_BACKEND_API_URL || 'http://localhost:3000',
};

// Warn about missing environment variables during development
if (__DEV__) {
  if (!ENV_SUPABASE_URL) console.warn('Missing SUPABASE_URL in environment variables');
  if (!ENV_SUPABASE_ANON_KEY) console.warn('Missing SUPABASE_ANON_KEY in environment variables');
  if (!ENV_STRIPE_PUBLISHABLE_KEY) console.warn('Missing STRIPE_PUBLISHABLE_KEY in environment variables');
}

// Environment configuration
export type EnvConfig = typeof defaultConfig;

// Config object with values from .env or defaults
const config: EnvConfig = {
  SUPABASE_URL: ENV_SUPABASE_URL || defaultConfig.SUPABASE_URL,
  SUPABASE_ANON_KEY: ENV_SUPABASE_ANON_KEY || defaultConfig.SUPABASE_ANON_KEY,
  STRIPE_PUBLISHABLE_KEY: ENV_STRIPE_PUBLISHABLE_KEY || defaultConfig.STRIPE_PUBLISHABLE_KEY,
  BACKEND_API_URL: ENV_BACKEND_API_URL || defaultConfig.BACKEND_API_URL,
};

console.log('Environment configuration loaded');

// Export config object for direct access
export const getEnv = (): EnvConfig => config;

// Export individual config values for convenience
export const SUPABASE_URL = (): string => config.SUPABASE_URL;
export const SUPABASE_ANON_KEY = (): string => config.SUPABASE_ANON_KEY;
export const STRIPE_PUBLISHABLE_KEY = (): string => config.STRIPE_PUBLISHABLE_KEY;
export const BACKEND_API_URL = (): string => config.BACKEND_API_URL;
