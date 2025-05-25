import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import { Alert, AppState, Platform } from 'react-native';
import { saveAppUsage, getAppUsage, getUserProfile } from './supabase';
import { AppSettings, AppUsageData, SocialMediaApp } from '../types';
import { blockApp as blockAppExternal } from './appBlocking';
import dayjs from 'dayjs';
import { SOCIAL_MEDIA_APPS } from '../constants/apps';

// Import native modules
import UsageStatsModule from './nativeModules/UsageStatsModule';

// Define the background task name
const APP_USAGE_TRACKING_TASK = 'app-usage-tracking';
const LOCAL_USAGE_KEY = 'local_usage_data';
const LAST_SYNC_KEY = 'last_usage_sync';
const TRACKING_INTERVAL_MINUTES = 15;

// Interface for local usage data
interface LocalUsageData {
  [date: string]: {
    [appId: string]: {
      minutes: number;
      lastUpdated: number; // timestamp
      sessions: {
        startTime: number;
        endTime: number;
        duration: number; // in seconds
      }[];
    };
  };
}

// Get real app usage data from the device using native module
const getAppUsageFromDevice = async (appId: string): Promise<number> => {
  try {
    // Check permission first
    const hasPermission = await UsageStatsModule.hasUsageStatsPermission();
    if (!hasPermission) {
      // Show alert to the user and open settings
      Alert.alert(
        'Permission Required',
        'App usage permission is required to track screen time. Please enable it in settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: () => UsageStatsModule.openUsageAccessSettings() 
          }
        ]
      );
      return 0;
    }

    // Get the package name for this app ID
    const appInfo = SOCIAL_MEDIA_APPS.find(app => app.id === appId);
    if (!appInfo || !appInfo.packageName) {
      console.error(`No package name found for app ID: ${appId}`);
      return 0;
    }

    // Get usage data for today
    const packageNames = [appInfo.packageName];
    const usageData = await UsageStatsModule.getTodayUsageTime(packageNames);
    
    // Extract minutes for this app
    const minutes = usageData[appInfo.packageName] || 0;
    
    // Log the data for debugging
    console.log(`Real usage data for ${appId} (${appInfo.packageName}): ${minutes} minutes`);
    
    return minutes;
  } catch (error) {
    console.error('Error getting app usage from device:', error);
    return 0;
  }
};

/**
 * Get local usage data from secure storage
 */
const getLocalUsageData = async (): Promise<LocalUsageData> => {
  try {
    const data = await SecureStore.getItemAsync(LOCAL_USAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error getting local usage data:', error);
    return {};
  }
};

/**
 * Save local usage data to secure storage
 */
const saveLocalUsageData = async (data: LocalUsageData): Promise<void> => {
  try {
    await SecureStore.setItemAsync(LOCAL_USAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving local usage data:', error);
  }
};

/**
 * Sync local usage data with the database
 */
const syncUsageDataWithDatabase = async (userId: string): Promise<void> => {
  try {
    // Get local data
    const localData = await getLocalUsageData();
    
    // Get last sync time
    const lastSyncStr = await SecureStore.getItemAsync(LAST_SYNC_KEY);
    const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
    const now = Date.now();
    
    // For each day in local data
    for (const date in localData) {
      // For each app in this day's data
      for (const appId in localData[date]) {
        const appData = localData[date][appId];
        
        // Only sync if updated since last sync
        if (appData.lastUpdated > lastSync) {
          // Save to database
          await saveAppUsage(userId, appId, appData.minutes, date);
        }
      }
    }
    
    // Update last sync time
    await SecureStore.setItemAsync(LAST_SYNC_KEY, now.toString());
    
    console.log('Synced usage data with database');
  } catch (error) {
    console.error('Error syncing usage data:', error);
  }
};

// Initialize usage tracking
export const initializeUsageTracking = async (userId: string) => {
  // Check for usage stats permission
  const hasPermission = await UsageStatsModule.hasUsageStatsPermission();
  if (!hasPermission) {
    // Prompt the user to grant permission
    Alert.alert(
      'Permission Required',
      'To track app usage, please grant usage access permission',
      [
        { text: 'Later', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => UsageStatsModule.openUsageAccessSettings() 
        }
      ]
    );
  }
  
  // Initialize app state tracking
  AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
      // App came to foreground, check for updates
      updateLocalUsageData(userId);
    }
  });
  
  // Register background task handler
  TaskManager.defineTask(APP_USAGE_TRACKING_TASK, async () => {
    try {
      console.log('[Background] Running usage tracking task');
      
      // Update local usage data
      await updateLocalUsageData(userId);
      
      // Sync with database
      await syncUsageDataWithDatabase(userId);
      
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
    minimumInterval: TRACKING_INTERVAL_MINUTES * 60, // minimum interval in seconds
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
  
  // Initial update
  await updateLocalUsageData(userId);
};

/**
 * Update local usage data for all tracked apps
 */
const updateLocalUsageData = async (userId: string): Promise<void> => {
  try {
    // Get usage data for each tracked app
    for (const app of SOCIAL_MEDIA_APPS) {
      await getAppUsageFromDevice(app.id);
    }
    
    // Sync with database if needed
    const lastSyncStr = await SecureStore.getItemAsync(LAST_SYNC_KEY);
    const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
    const now = Date.now();
    
    // If last sync was more than 30 minutes ago, sync now
    if (now - lastSync > 30 * 60 * 1000) {
      await syncUsageDataWithDatabase(userId);
    }
  } catch (error) {
    console.error('Error updating local usage data:', error);
  }
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
      await blockAppsFromService(SOCIAL_MEDIA_APPS.map(app => app.id));
      
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

// Import the blocking functions from appBlocking.ts
import { blockApp as blockAppFromService, blockApps as blockAppsFromService } from './appBlocking';

// Block a single app
const blockApp = async (appId: string) => {
  await blockAppExternal(appId);
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
