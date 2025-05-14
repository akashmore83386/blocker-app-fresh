import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings, User, SocialMediaApp, UsageStats } from '../types';
import { getCurrentUser, getUserProfile, updateUserProfile } from '../services/supabase';
import { SOCIAL_MEDIA_APPS, calculateUsageStats, initializeUsageTracking } from '../services/usageTracking';
import { processEmergencyUnlock } from '../services/stripe';

interface AppContextProps {
  user: User | null;
  isLoading: boolean;
  settings: AppSettings;
  socialMediaApps: SocialMediaApp[];
  usageStats: UsageStats | null;
  blockedApps: string[];
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  refreshUsageStats: () => Promise<void>;
  unlockApp: (appId: string, duration: number) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const defaultSettings: AppSettings = {
  dailyLimits: {
    youtube: 60, // 60 minutes
    facebook: 30,
    twitter: 30,
    instagram: 30,
  },
  emergencyUnlockAmount: 3, // $3 default
  combinedLimit: false,
};

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [blockedApps, setBlockedApps] = useState<string[]>([]);

  // Initialize on app load
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check if user is authenticated
        const authUser = await getCurrentUser();
        
        if (authUser) {
          // Get user profile
          const profile = await getUserProfile(authUser.id);
          setUser(profile);
          
          // Get user settings or use defaults
          if (profile.settings) {
            setSettings(profile.settings);
          } else {
            // Create default settings if none exist
            await updateUserProfile(authUser.id, {
              ...profile,
              settings: defaultSettings,
            });
          }
          
          // Initialize usage tracking
          await initializeUsageTracking(authUser.id);
          
          // Get initial usage stats
          await refreshUsageStats();
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeApp();
  }, []);

  // Update settings
  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    if (!user) return;
    
    try {
      const updatedSettings = {
        ...settings,
        ...newSettings,
      };
      
      setSettings(updatedSettings);
      
      await updateUserProfile(user.id, {
        ...user,
        settings: updatedSettings,
      });
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  // Refresh usage statistics
  const refreshUsageStats = async () => {
    if (!user) return;
    
    try {
      const stats = await calculateUsageStats(user.id);
      setUsageStats(stats);
      
      // Update blocked apps list (note: in a real app this would come from the usage tracking native module)
      // For this demo, we'll simulate by checking if any app exceeds its daily limit
      const today = new Date().toISOString().split('T')[0];
      const newBlockedApps: string[] = [];
      
      if (stats.dailyUsage[today]) {
        if (settings.combinedLimit) {
          // Check combined limit
          const totalUsage = Object.values(stats.dailyUsage[today]).reduce((sum, minutes) => sum + minutes, 0);
          const combinedLimit = Object.values(settings.dailyLimits)[0] || 120;
          
          if (totalUsage > combinedLimit) {
            SOCIAL_MEDIA_APPS.forEach(app => newBlockedApps.push(app.id));
          }
        } else {
          // Check individual limits
          Object.entries(stats.dailyUsage[today]).forEach(([appId, minutes]) => {
            const limit = settings.dailyLimits[appId] || 120;
            if (minutes > limit) {
              newBlockedApps.push(appId);
            }
          });
        }
      }
      
      setBlockedApps(newBlockedApps);
    } catch (error) {
      console.error('Error refreshing usage stats:', error);
    }
  };

  // Process emergency unlock
  const unlockApp = async (appId: string, duration: number) => {
    if (!user) return false;
    
    try {
      const result = await processEmergencyUnlock(
        user.id,
        appId,
        settings.emergencyUnlockAmount,
        duration
      );
      
      if (result) {
        // Remove app from blocked list
        setBlockedApps(prev => prev.filter(id => id !== appId));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error unlocking app:', error);
      return false;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await import('../services/supabase').then(({ signOut }) => signOut());
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        isLoading,
        settings,
        socialMediaApps: SOCIAL_MEDIA_APPS,
        usageStats,
        blockedApps,
        updateSettings,
        refreshUsageStats,
        unlockApp,
        signOut,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
