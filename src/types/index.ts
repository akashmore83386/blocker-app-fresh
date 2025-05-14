export interface AppSettings {
  dailyLimits: {
    [key: string]: number; // app name -> minutes
  };
  emergencyUnlockAmount: number;
  combinedLimit: boolean;
}

export interface SocialMediaApp {
  id: string;
  name: string;
  packageName: string;
  iconName: string;
}

export interface AppUsageData {
  appId: string;
  minutes: number;
  date: string;
}

export interface User {
  id: string;
  email: string;
  createdAt: string;
  settings: AppSettings;
}

export interface PaymentDetails {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'completed' | 'refunded';
  createdAt: string;
  refundedAt?: string;
  appId: string;
  unlockDuration: number; // minutes
}

export interface UsageStats {
  dailyUsage: Record<string, Record<string, number>>; // date -> app -> minutes
  weeklyTotals: Record<string, number>; // app -> minutes
  monthlyTotals: Record<string, number>; // app -> minutes
}
