import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { saveAppUsage, getAppUsage } from './supabase';
import { AppSettings, AppUsageData, SocialMediaApp } from '../types';
import dayjs from 'dayjs';

// Define the background task name
const APP_USAGE_TRACKING_TASK = 'app-usage-tracking';

// List of tracked social media apps
export const SOCIAL_MEDIA_APPS: SocialMediaApp[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    packageName: 'com.google.android.youtube',
    iconName: 'youtube',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    packageName: 'com.facebook.katana',
    iconName: 'facebook',
  },
  {
    id: 'twitter',
    name: 'Twitter',
    packageName: 'com.twitter.android',
    iconName: 'twitter',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    packageName: 'com.instagram.android',
    iconName: 'instagram',
  },
];

// Mock function for getting app usage data
// In a real app, you would use a native module to access actual usage statistics
const getAppUsageFromDevice = async (appId: string): Promise<number> => {
  // In a real app, this would connect to native code that accesses app usage stats
  // For this demo, we'll return random minutes between 0 and 120
  return Math.floor(Math.random() * 120);
};

// Initialize usage tracking
export const initializeUsageTracking = async (userId: string) => {
  // Register background task handler
  TaskManager.defineTask(APP_USAGE_TRACKING_TASK, async () => {
    try {
      console.log('[Background] Running usage tracking task');
      
      // Get usage data for each tracked app
      for (const app of SOCIAL_MEDIA_APPS) {
        const minutes = await getAppUsageFromDevice(app.id);
        await saveAppUsage(userId, app.id, minutes);
      }
      
      // Check if any app has exceeded its limit
      await checkAppLimits(userId);
      
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
      console.error('[Background] Error in tracking task:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
  
  // Register the background fetch task
  await BackgroundFetch.registerTaskAsync(APP_USAGE_TRACKING_TASK, {
    minimumInterval: 15 * 60, // 15 minutes minimum interval
    stopOnTerminate: false,
    startOnBoot: true,
  });
  
  // Configure notifications
  await Notifications.setNotificationChannelAsync('app-limits', {
    name: 'App Limits',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });
};

// Check if any app has exceeded its daily limit
export const checkAppLimits = async (userId: string) => {
  // Get user settings
  const userProfile = await import('./supabase').then(({ getUserProfile }) => getUserProfile(userId));
  
  if (!userProfile || !userProfile.settings) {
    console.log('No user profile or settings found');
    return;
  }
  
  const { dailyLimits, combinedLimit } = userProfile.settings;
  
  // Get today's usage
  const today = dayjs().format('YYYY-MM-DD');
  const usageData = await getAppUsage(userId, today, today);
  
  // Filter to only include social media apps
  const socialMediaUsage = usageData.filter((usage: any) => 
    SOCIAL_MEDIA_APPS.some(app => app.id === usage.app_id)
  );
  
  if (combinedLimit) {
    // Calculate combined total minutes
    const totalMinutes = socialMediaUsage.reduce((sum: number, usage: any) => sum + usage.minutes, 0);
    
    // Get the combined limit (using first app's limit as the combined limit)
    const combinedLimitValue = Object.values(dailyLimits)[0] || 120; // Default to 120 minutes
    
    if (totalMinutes > combinedLimitValue) {
      // Block all social media apps
      await blockApps(SOCIAL_MEDIA_APPS.map(app => app.id));
      
      // Send notification
      await sendLimitNotification(
        'Combined App Limit Reached',
        `You've used social media for ${totalMinutes} minutes, exceeding your daily limit of ${combinedLimitValue} minutes.`
      );
    }
  } else {
    // Check each app individually
    for (const usage of socialMediaUsage) {
      const appId = usage.app_id;
      const minutes = usage.minutes;
      const appLimit = dailyLimits[appId] || 120; // Default to 120 minutes if not set
      
      if (minutes > appLimit) {
        // Block this specific app
        await blockApp(appId);
        
        // Find app name
        const app = SOCIAL_MEDIA_APPS.find(a => a.id === appId);
        
        // Send notification
        await sendLimitNotification(
          `${app?.name || 'App'} Limit Reached`,
          `You've used ${app?.name || 'this app'} for ${minutes} minutes, exceeding your daily limit of ${appLimit} minutes.`
        );
      }
    }
  }
};

// Mock function to block apps
// In a real app, this would use a native module to block access to the app
const blockApps = async (appIds: string[]) => {
  console.log(`Blocking apps: ${appIds.join(', ')}`);
  // In a real app, this would call native code to block the apps
};

// Block a single app
const blockApp = async (appId: string) => {
  await blockApps([appId]);
};

// Unblock an app temporarily after payment
export const unblockAppTemporarily = async (appId: string, durationMinutes: number) => {
  console.log(`Temporarily unblocking ${appId} for ${durationMinutes} minutes`);
  
  // Unblock the app
  // In a real app, this would call native code to unblock the app
  
  // Schedule re-blocking after the duration
  setTimeout(async () => {
    await blockApp(appId);
    
    // Send notification
    await sendLimitNotification(
      'Temporary Access Expired',
      `Your temporary access to ${SOCIAL_MEDIA_APPS.find(app => app.id === appId)?.name || 'the app'} has expired.`
    );
  }, durationMinutes * 60 * 1000);
};

// Send a notification about app limits
const sendLimitNotification = async (title: string, body: string) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
    },
    trigger: null, // Send immediately
  });
};

// Calculate usage statistics
export const calculateUsageStats = async (userId: string, days: number = 7) => {
  // Get start date (X days ago)
  const startDate = dayjs().subtract(days, 'day').format('YYYY-MM-DD');
  const endDate = dayjs().format('YYYY-MM-DD');
  
  // Get usage data for the period
  const usageData = await getAppUsage(userId, startDate, endDate);
  
  // Process daily usage
  const dailyUsage: Record<string, Record<string, number>> = {};
  const weeklyTotals: Record<string, number> = {};
  
  // Initialize app totals
  SOCIAL_MEDIA_APPS.forEach(app => {
    weeklyTotals[app.id] = 0;
  });
  
  // Process each usage record
  usageData.forEach((usage: any) => {
    const { app_id, date, minutes } = usage;
    
    // Add to daily usage
    if (!dailyUsage[date]) {
      dailyUsage[date] = {};
    }
    dailyUsage[date][app_id] = minutes;
    
    // Add to weekly total
    weeklyTotals[app_id] = (weeklyTotals[app_id] || 0) + minutes;
  });
  
  return {
    dailyUsage,
    weeklyTotals,
    monthlyTotals: weeklyTotals, // For demo, using the same data
  };
};

// Stop usage tracking
export const stopUsageTracking = async () => {
  await BackgroundFetch.unregisterTaskAsync(APP_USAGE_TRACKING_TASK);
};
