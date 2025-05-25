import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { Alert, AppState, Linking, Platform } from 'react-native';
import { SocialMediaApp } from '../types';
import { SOCIAL_MEDIA_APPS } from '../constants/apps';

// Import the native AppBlockerModule
import AppBlockerModule from './nativeModules/AppBlockerModule';

// Constants
const BLOCKED_APPS_KEY = 'blocked_apps';
const TEMP_UNBLOCKED_APPS_KEY = 'temp_unblocked_apps';

// Types for temporary unblocks
interface TempUnblock {
  appId: string;
  expiresAt: number; // timestamp
}

/**
 * Initialize the app blocking system
 * @returns Promise<boolean> True if initialization was successful
 */
export const initializeAppBlocking = async (): Promise<boolean> => {
  try {
    // Setup notification channel for blocking alerts
    await Notifications.setNotificationChannelAsync('app-blocking', {
      name: 'App Blocking',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });

    // Check if we have overlay permission (required for app blocking)
    const hasPermission = await AppBlockerModule.hasOverlayPermission();
    if (!hasPermission) {
      // Prompt user to grant permission
      return new Promise<boolean>((resolve) => {
        Alert.alert(
          'Permission Required',
          'To block apps, we need permission to display over other apps. Without this permission, app blocking will not work properly.',
          [
            { 
              text: 'Later', 
              style: 'cancel',
              onPress: () => {
                console.log('User declined overlay permission');
                resolve(false);
              }
            },
            { 
              text: 'Grant Permission', 
              onPress: () => {
                AppBlockerModule.requestOverlayPermission();
                console.log('User prompted for overlay permission');
                resolve(false); // Permission result will be unknown at this point
              }
            }
          ],
          { cancelable: false } // Prevent dismissing the alert by tapping outside
        );
      });
    } else {
      // Start the blocker service if we have permission
      const serviceStarted = await AppBlockerModule.startBlockerService();
      if (!serviceStarted) {
        console.error('Failed to start blocker service');
        return false;
      }
      console.log('App blocking system initialized successfully');
      return true;
    }
  } catch (error) {
    console.error('Error initializing app blocking system:', error);
    return false;
  }
  
  try {
    // Check and clean up expired temporary unblocks
    await cleanupExpiredUnblocks();

    // Add app state change listener to detect when user tries to open blocked apps
    AppState.addEventListener('change', handleAppStateChange);

    console.log('App blocking system initialized');
    return true;
  } catch (error) {
    console.error('Error during post-initialization:', error);
    return false;
  }
};

/**
 * Handle app state changes to detect when user tries to access blocked apps
 */
const handleAppStateChange = async (nextAppState: string) => {
  if (nextAppState === 'active') {
    // Check if we have permission
    const hasPermission = await AppBlockerModule.hasOverlayPermission();
    if (!hasPermission) {
      return;
    }
    
    // Make sure the blocker service is running
    await AppBlockerModule.startBlockerService();
    
    // Check if we need to show blocking screen
    const blockedApps = await getBlockedApps();
    if (blockedApps.length > 0) {
      // The native AppBlockerService will automatically detect and block apps
      // We don't need to do anything here
      console.log('Blocking service is active for apps:', blockedApps);
    }
  }
};

/**
 * Simulate checking if user is using a blocked app
 * In a real implementation, this would use native modules to detect foreground app
 */
const checkIfUsingBlockedApp = async () => {
  // Get the list of blocked apps
  const blockedApps = await getBlockedApps();
  const tempUnblockedApps = await getTempUnblockedApps();
  
  // Filter out temporarily unblocked apps
  const currentlyBlockedApps = blockedApps.filter(
    appId => !tempUnblockedApps.some(unblock => unblock.appId === appId)
  );
  
  if (currentlyBlockedApps.length === 0) return;
  
  // Simulate detection of app usage by showing a notification
  // In a real implementation, you would only show this when the specific app is detected
  const randomIndex = Math.floor(Math.random() * currentlyBlockedApps.length);
  const appId = currentlyBlockedApps[randomIndex];
  
  // Find app details
  const appDetails = SOCIAL_MEDIA_APPS.find(app => app.id === appId);
  
  if (appDetails) {
    showBlockingNotification(appDetails);
  }
};

/**
 * Show a notification when a blocked app is detected
 */
const showBlockingNotification = async (app: SocialMediaApp) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${app.name} is blocked`,
      body: `You've reached your daily limit for ${app.name}. Open the Blocker App to manage your usage.`,
      data: { appId: app.id },
    },
    trigger: null, // Send immediately
  });
};

/**
 * Block a list of apps
 */
export const blockApps = async (appIds: string[]): Promise<boolean> => {
  try {
    // Check if we have overlay permission
    const hasPermission = await AppBlockerModule.hasOverlayPermission();
    if (!hasPermission) {
      // Prompt user to grant permission
      Alert.alert(
        'Permission Required',
        'To block apps, we need permission to display over other apps',
        [
          { text: 'Later', style: 'cancel' },
          { 
            text: 'Grant Permission', 
            onPress: () => AppBlockerModule.requestOverlayPermission() 
          }
        ]
      );
      return false;
    }

    // Get package names for these app IDs
    const packageNames: string[] = [];
    for (const appId of appIds) {
      const app = SOCIAL_MEDIA_APPS.find(a => a.id === appId);
      if (app && app.packageName) {
        packageNames.push(app.packageName);
      }
    }

    if (packageNames.length === 0) {
      console.error('No valid package names found for app IDs');
      return false;
    }

    // Use the native module to block these apps
    await AppBlockerModule.blockApps(packageNames);
    
    // Also save the list locally for our reference
    const currentBlockedApps = await getBlockedApps();
    const updatedBlockedApps = Array.from(new Set([...currentBlockedApps, ...appIds]));
    await SecureStore.setItemAsync(BLOCKED_APPS_KEY, JSON.stringify(updatedBlockedApps));
    
    // For each newly blocked app, show a notification
    for (const appId of appIds) {
      if (!currentBlockedApps.includes(appId)) {
        const app = SOCIAL_MEDIA_APPS.find(a => a.id === appId);
        if (app) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `${app.name} is now blocked`,
              body: `You've reached your daily limit for ${app.name}.`,
              data: { appId },
            },
            trigger: null,
          });
        }
      }
    }
    
    console.log(`Blocked apps: ${appIds.join(', ')}`);
    return true;
  } catch (error) {
    console.error('Error blocking apps:', error);
    return false;
  }
};

/**
 * Block a single app
 */
export const blockApp = async (appId: string): Promise<boolean> => {
  return blockApps([appId]);
};

/**
 * Unblock a specific app temporarily
 */
export const unblockAppTemporarily = async (
  appId: string,
  durationMinutes: number
): Promise<boolean> => {
  try {
    // Get the package name for this app ID
    const app = SOCIAL_MEDIA_APPS.find(a => a.id === appId);
    if (!app || !app.packageName) {
      console.error(`No package name found for app ID: ${appId}`);
      return false;
    }

    // Use the native module to temporarily unblock this app
    await AppBlockerModule.unblockAppTemporarily(app.packageName, durationMinutes);
    
    // Also save the information locally for our reference
    const tempUnblocks = await getTempUnblockedApps();
    const filteredUnblocks = tempUnblocks.filter(unblock => unblock.appId !== appId);
    const expiresAt = Date.now() + durationMinutes * 60 * 1000;
    filteredUnblocks.push({
      appId,
      expiresAt,
    });
    
    // Save updated list
    await SecureStore.setItemAsync(
      TEMP_UNBLOCKED_APPS_KEY,
      JSON.stringify(filteredUnblocks)
    );
    
    // Show a notification that the app is temporarily unblocked
    if (app) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${app.name} temporarily unblocked`,
          body: `You can use ${app.name} for ${durationMinutes} minutes.`,
          data: { appId },
        },
        trigger: null,
      });
      
      // The re-blocking notification will be handled by the native module
      // But we'll still schedule our own notification as a backup
      const timeUntilExpiry = expiresAt - Date.now();
      setTimeout(async () => {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${app.name} access expired`,
            body: `Your temporary access to ${app.name} has expired.`,
            data: { appId },
          },
          trigger: null, // Send immediately when the timeout triggers
        });
      }, timeUntilExpiry);
    }
    
    console.log(`Temporarily unblocked ${appId} for ${durationMinutes} minutes`);
    return true;
  } catch (error) {
    console.error('Error unblocking app temporarily:', error);
    return false;
  }
};

/**
 * Clean up expired temporary unblocks
 */
export const cleanupExpiredUnblocks = async (): Promise<void> => {
  try {
    const tempUnblocks = await getTempUnblockedApps();
    const now = Date.now();
    
    // Filter out expired unblocks
    const validUnblocks = tempUnblocks.filter(unblock => unblock.expiresAt > now);
    
    if (validUnblocks.length !== tempUnblocks.length) {
      // Save updated list
      await SecureStore.setItemAsync(
        TEMP_UNBLOCKED_APPS_KEY,
        JSON.stringify(validUnblocks)
      );
      
      console.log('Cleaned up expired temporary unblocks');
    }
  } catch (error) {
    console.error('Error cleaning up expired unblocks:', error);
  }
};

/**
 * Get the list of currently blocked apps
 */
export const getBlockedApps = async (): Promise<string[]> => {
  try {
    // Check if we have permission to get blocked apps
    const hasPermission = await AppBlockerModule.hasOverlayPermission();
    if (!hasPermission) {
      // Fall back to local storage
      const blockedAppsJson = await SecureStore.getItemAsync(BLOCKED_APPS_KEY);
      return blockedAppsJson ? JSON.parse(blockedAppsJson) : [];
    }

    // Get the list of blocked apps from the native module
    const packageNames = await AppBlockerModule.getBlockedApps();
    
    // Convert package names to app IDs
    const appIds: string[] = [];
    for (const packageName of packageNames) {
      const app = SOCIAL_MEDIA_APPS.find(a => a.packageName === packageName);
      if (app) {
        appIds.push(app.id);
      }
    }
    
    return appIds;
  } catch (error) {
    console.error('Error getting blocked apps:', error);
    // Fall back to local storage
    const blockedAppsJson = await SecureStore.getItemAsync(BLOCKED_APPS_KEY);
    return blockedAppsJson ? JSON.parse(blockedAppsJson) : [];
  }
};

/**
 * Get the list of temporarily unblocked apps
 */
export const getTempUnblockedApps = async (): Promise<TempUnblock[]> => {
  try {
    const unblockJson = await SecureStore.getItemAsync(TEMP_UNBLOCKED_APPS_KEY);
    return unblockJson ? JSON.parse(unblockJson) : [];
  } catch (error) {
    console.error('Error getting temp unblocked apps:', error);
    return [];
  }
};

/**
 * Check if a specific app is currently blocked
 */
export const isAppBlocked = async (appId: string): Promise<boolean> => {
  try {
    // Check permission first
    const hasPermission = await AppBlockerModule.hasOverlayPermission();
    if (!hasPermission) {
      // Fall back to local implementation if no permission
      const blockedApps = await getBlockedApps();
      if (!blockedApps.includes(appId)) return false;
      
      const tempUnblocks = await getTempUnblockedApps();
      const tempUnblock = tempUnblocks.find(unblock => unblock.appId === appId);
      
      if (!tempUnblock) return true; // Blocked and not temporarily unblocked
      return tempUnblock.expiresAt <= Date.now();
    }
    
    // Find the package name for this app ID
    const app = SOCIAL_MEDIA_APPS.find(a => a.id === appId);
    if (!app || !app.packageName) {
      console.error(`No package name found for app ID: ${appId}`);
      return false;
    }
    
    // Get all blocked apps from native module
    const blockedPackageNames = await AppBlockerModule.getBlockedApps();
    
    // Check if this app's package is in the blocked list
    return blockedPackageNames.includes(app.packageName);
  } catch (error) {
    console.error('Error checking if app is blocked:', error);
    return false;
  }
};

/**
 * Unblock all apps (for testing or reset)
 */
export const unblockAllApps = async (): Promise<boolean> => {
  try {
    // Check permission first
    const hasPermission = await AppBlockerModule.hasOverlayPermission();
    if (hasPermission) {
      // Stop the blocker service to unblock all apps
      await AppBlockerModule.stopBlockerService();
    }
    
    // Also clear local storage
    await SecureStore.deleteItemAsync(BLOCKED_APPS_KEY);
    await SecureStore.deleteItemAsync(TEMP_UNBLOCKED_APPS_KEY);
    
    console.log('Unblocked all apps');
    return true;
  } catch (error) {
    console.error('Error unblocking all apps:', error);
    return false;
  }
};

// Circular dependency resolved by moving SOCIAL_MEDIA_APPS to a separate constant file
